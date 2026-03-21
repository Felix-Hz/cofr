"""Auth tests: JWT unit tests, registration, login, soft-delete."""

import os
from datetime import UTC, datetime, timedelta

import jwt as pyjwt
import pytest

from app.auth.jwt import create_access_token, verify_token
from app.db.models import Account, AuthProvider, User
from tests.conftest import VALID_PASSWORD, register_user

# ── JWT unit tests (no HTTP) ──


def test_create_token_has_expected_claims():
    token = create_access_token(user_id="abc-123", username="alice")
    payload = pyjwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    assert payload["user_id"] == "abc-123"
    assert payload["username"] == "alice"
    assert "exp" in payload


def test_verify_valid_token():
    token = create_access_token(user_id="u1", username="bob")
    payload = verify_token(token)
    assert payload is not None
    assert payload["user_id"] == "u1"


def test_verify_expired_token_returns_none():
    expired = datetime.now(UTC) - timedelta(hours=1)
    token = pyjwt.encode(
        {"user_id": "u1", "username": "x", "exp": expired},
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )
    assert verify_token(token) is None


def test_verify_invalid_signature_returns_none():
    token = pyjwt.encode(
        {"user_id": "u1", "username": "x", "exp": datetime.now(UTC) + timedelta(hours=1)},
        "wrong-secret-key-definitely-not-the-right-one",
        algorithm="HS256",
    )
    assert verify_token(token) is None


def test_verify_garbage_returns_none():
    assert verify_token("not.a.jwt") is None
    assert verify_token("") is None


# ── Registration ──


def test_register_success_201(client):
    resp = client.post(
        "/auth/local/register",
        json={"email": "new@example.com", "password": VALID_PASSWORD, "name": "New"},
    )
    assert resp.status_code == 201
    token = resp.json()["token"]
    assert verify_token(token) is not None


def test_register_creates_user_and_auth_provider(client, db_session):
    register_user(client, email="db@example.com")
    provider = (
        db_session.query(AuthProvider)
        .filter(AuthProvider.provider_user_id == "db@example.com")
        .first()
    )
    assert provider is not None
    assert provider.provider == "local"
    user = db_session.query(User).filter(User.id == provider.user_id).first()
    assert user is not None


def test_register_creates_system_accounts(client, db_session):
    token = register_user(client, email="acct@example.com")
    payload = pyjwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    accounts = db_session.query(Account).filter(Account.user_id == payload["user_id"]).all()
    assert len(accounts) == 3
    types = {a.type for a in accounts}
    assert types == {"checking", "savings", "investment"}


def test_register_email_normalized(client, db_session):
    register_user(client, email="FOO@BAR.COM")
    provider = (
        db_session.query(AuthProvider)
        .filter(AuthProvider.provider_user_id == "foo@bar.com")
        .first()
    )
    assert provider is not None


def test_register_duplicate_email_409(client):
    register_user(client, email="dup@example.com")
    resp = client.post(
        "/auth/local/register",
        json={"email": "dup@example.com", "password": VALID_PASSWORD, "name": "Dup"},
    )
    assert resp.status_code == 409


@pytest.mark.parametrize(
    "password,reason",
    [
        ("Sh0r!", "too short"),
        ("alllower1!", "no uppercase"),
        ("ALLUPPER1!", "no lowercase"),
        ("NoDigits!!", "no digit"),
        ("NoSpecial1", "no special char"),
    ],
)
def test_register_weak_password_422(client, password, reason):
    resp = client.post(
        "/auth/local/register",
        json={"email": "weak@example.com", "password": password, "name": "X"},
    )
    assert resp.status_code == 422, f"Expected 422 for {reason}, got {resp.status_code}"


# ── Login ──


def test_login_success(client):
    register_user(client, email="login@example.com")
    resp = client.post(
        "/auth/local/login",
        json={"email": "login@example.com", "password": VALID_PASSWORD},
    )
    assert resp.status_code == 200
    assert verify_token(resp.json()["token"]) is not None


def test_login_wrong_password_401(client):
    register_user(client, email="wrong@example.com")
    resp = client.post(
        "/auth/local/login",
        json={"email": "wrong@example.com", "password": "WrongPass1!"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid email or password"


def test_login_nonexistent_email_401(client):
    resp = client.post(
        "/auth/local/login",
        json={"email": "ghost@example.com", "password": VALID_PASSWORD},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid email or password"


def test_login_reactivates_soft_deleted_user(client, db_session):
    register_user(client, email="soft@example.com")
    provider = (
        db_session.query(AuthProvider)
        .filter(AuthProvider.provider_user_id == "soft@example.com")
        .first()
    )
    user = db_session.query(User).filter(User.id == provider.user_id).first()
    user.deleted_at = datetime.now(UTC)
    db_session.commit()

    resp = client.post(
        "/auth/local/login",
        json={"email": "soft@example.com", "password": VALID_PASSWORD},
    )
    assert resp.status_code == 200

    db_session.refresh(user)
    assert user.deleted_at is None


# ── Auth dependency: soft-deleted user blocked ──


def test_soft_deleted_user_blocked_401(client, db_session):
    token = register_user(client, email="blocked@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    provider = (
        db_session.query(AuthProvider)
        .filter(AuthProvider.provider_user_id == "blocked@example.com")
        .first()
    )
    user = db_session.query(User).filter(User.id == provider.user_id).first()
    user.deleted_at = datetime.now(UTC)
    db_session.commit()

    resp = client.get("/expenses/", headers=headers)
    assert resp.status_code == 401


# ── Email verification ──


def test_register_sets_email_verified_false(client, db_session):
    token = register_user(client, email="verify@example.com")
    payload = pyjwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    user = db_session.query(User).filter(User.id == payload["user_id"]).first()
    assert user.email_verified is False


def test_verify_email_valid_token(client, db_session):
    from app.email.tokens import generate_verification_token

    token = register_user(client, email="vtoken@example.com")
    payload = pyjwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    user_id = payload["user_id"]

    verify_tok = generate_verification_token(user_id, "vtoken@example.com")
    resp = client.get(f"/auth/local/verify-email?token={verify_tok}", follow_redirects=False)
    assert resp.status_code == 302
    assert "verified=true" in resp.headers["location"]

    user = db_session.query(User).filter(User.id == user_id).first()
    assert user.email_verified is True


def test_verify_email_invalid_token_redirects(client):
    resp = client.get("/auth/local/verify-email?token=garbage", follow_redirects=False)
    assert resp.status_code == 302
    assert "verified=invalid" in resp.headers["location"]


def test_resend_verification_success(client, db_session):
    token = register_user(client, email="resend@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.post("/auth/local/resend-verification", headers=headers)
    assert resp.status_code == 200


def test_resend_verification_already_verified_400(client, db_session):
    token = register_user(client, email="already@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    payload = pyjwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    user = db_session.query(User).filter(User.id == payload["user_id"]).first()
    user.email_verified = True
    db_session.commit()

    resp = client.post("/auth/local/resend-verification", headers=headers)
    assert resp.status_code == 400


def test_resend_verification_rate_limited(client, db_session):
    from app.email.rate_limit import email_rate_limiter

    token = register_user(client, email="ratelim@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Exhaust rate limit
    for _ in range(5):
        email_rate_limiter.check("ratelim@example.com", max_count=5, window_seconds=3600)

    resp = client.post("/auth/local/resend-verification", headers=headers)
    assert resp.status_code == 429
