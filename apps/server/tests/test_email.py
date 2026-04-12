"""Email module tests: templates, tokens, rate limiter, provider factory, suppression."""

import time

import pytest
from itsdangerous import BadSignature, SignatureExpired

from app.config import settings
from app.db.models import EmailSuppression
from app.email import get_email_provider
from app.email.provider import ConsoleProvider
from app.email.rate_limit import RateLimiter
from app.email.service import _hash_email, is_suppressed
from app.email.templates import render_template
from app.email.tokens import (
    generate_password_reset_token,
    generate_verification_token,
    password_reset_token_matches,
    validate_password_reset_token,
    validate_verification_token,
)

# ── Template rendering ──


def test_verification_template_contains_link():
    html = render_template("verification", verify_url="https://cofr.cash/verify?token=abc123")
    assert "https://cofr.cash/verify?token=abc123" in html
    assert "Verify email" in html
    assert "24 hours" in html


def test_welcome_template_contains_name():
    html = render_template("welcome", name="Alice")
    assert "Alice" in html
    assert "Welcome" in html


def test_password_reset_template_contains_link():
    html = render_template("password_reset", reset_url="https://cofr.cash/reset?token=abc123")
    assert "https://cofr.cash/reset?token=abc123" in html
    assert "Reset password" in html
    assert "1 hour" in html


def test_base_template_has_cofr_branding():
    html = render_template("verification", verify_url="https://example.com")
    assert "cofr" in html


def test_dev_email_preview_index_available_in_local_env(client, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "local")
    response = client.get("/dev/email-preview")
    assert response.status_code == 200
    assert "Email preview" in response.text
    assert "render_template" in response.text
    assert "template=verification&person=alice" in response.text


def test_dev_email_preview_verification_renders_html(client, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "local")
    response = client.get("/dev/email-preview?template=verification&person=bob")
    assert response.status_code == 200
    assert "srcdoc=" in response.text
    assert "preview-bob-token" in response.text


def test_dev_email_preview_welcome_uses_sample_name(client, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "local")
    response = client.get("/dev/email-preview?template=welcome&person=alice")
    assert response.status_code == 200
    assert "Hi Alice," in response.text


def test_dev_email_preview_hidden_in_production(client, monkeypatch):
    monkeypatch.setattr(settings, "ENV", "production")
    response = client.get("/dev/email-preview")
    assert response.status_code == 404


# ── Token generation / validation ──


def test_token_roundtrip():
    token = generate_verification_token("user-123", "alice@example.com")
    payload = validate_verification_token(token)
    assert payload["user_id"] == "user-123"
    assert payload["email"] == "alice@example.com"
    assert payload["purpose"] == "verify"


def test_token_tampered_raises_bad_signature():
    token = generate_verification_token("user-123", "alice@example.com")
    with pytest.raises(BadSignature):
        validate_verification_token(token + "tampered")


def test_password_reset_token_roundtrip():
    token = generate_password_reset_token("user-123", "alice@example.com", "hashed-password")
    payload = validate_password_reset_token(token)
    assert payload["user_id"] == "user-123"
    assert payload["email"] == "alice@example.com"
    assert payload["purpose"] == "reset_password"
    assert password_reset_token_matches("hashed-password", payload) is True


def test_token_expired_raises_signature_expired(monkeypatch):
    token = generate_verification_token("user-123", "alice@example.com")
    # Monkeypatch the max_age to 0 to simulate expiry
    from app.email import tokens

    original_max_age = tokens.VERIFICATION_MAX_AGE
    monkeypatch.setattr(tokens, "VERIFICATION_MAX_AGE", 0)
    # Need to wait at least 1 second for the token to be "expired"
    time.sleep(1.1)
    with pytest.raises(SignatureExpired):
        tokens._serializer.loads(token, max_age=0)
    monkeypatch.setattr(tokens, "VERIFICATION_MAX_AGE", original_max_age)


# ── Rate limiter ──


def test_rate_limiter_allows_under_limit():
    rl = RateLimiter()
    for _ in range(5):
        assert rl.check("test@example.com", max_count=5, window_seconds=3600) is True


def test_rate_limiter_blocks_over_limit():
    rl = RateLimiter()
    for _ in range(5):
        rl.check("test@example.com", max_count=5, window_seconds=3600)
    assert rl.check("test@example.com", max_count=5, window_seconds=3600) is False


def test_rate_limiter_different_keys_independent():
    rl = RateLimiter()
    for _ in range(5):
        rl.check("a@example.com", max_count=5, window_seconds=3600)
    assert rl.check("b@example.com", max_count=5, window_seconds=3600) is True


def test_rate_limiter_window_expiry():
    rl = RateLimiter()
    # Manually inject old timestamps
    rl._store["test@example.com"] = [time.time() - 7200] * 5  # 2 hours ago
    assert rl.check("test@example.com", max_count=5, window_seconds=3600) is True


# ── Provider factory ──


def test_empty_resend_key_returns_console_provider():
    provider = get_email_provider()
    assert isinstance(provider, ConsoleProvider)


# ── Email hashing ──


def test_email_hash_deterministic():
    h1 = _hash_email("Alice@Example.COM")
    h2 = _hash_email("alice@example.com")
    assert h1 == h2


def test_email_hash_is_sha256():
    import hashlib

    expected = hashlib.sha256(b"alice@example.com").hexdigest()
    assert _hash_email("Alice@Example.com") == expected


# ── Suppression check ──


def test_is_suppressed_returns_false_when_not_suppressed(db_session):
    assert is_suppressed(db_session, "clean@example.com") is False


def test_is_suppressed_returns_true_when_suppressed(db_session):
    email_hash = _hash_email("blocked@example.com")
    db_session.add(EmailSuppression(email_hash=email_hash, reason="hard_bounce"))
    db_session.commit()
    assert is_suppressed(db_session, "blocked@example.com") is True
