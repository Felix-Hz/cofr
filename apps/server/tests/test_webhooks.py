"""Webhook tests: Resend event parsing, bounce/complaint handling, suppression."""

import json
from unittest.mock import patch

import pytest

from app.db.models import EmailEvent, EmailSuppression
from app.routers.webhooks import _hash_email


@pytest.fixture(autouse=True)
def bypass_webhook_signature():
    """Bypass Svix signature verification in all webhook tests."""
    with patch("app.routers.webhooks._verify_webhook_signature", return_value=True):
        yield


# ── Bounce → event + suppression ──


def test_bounce_creates_event_and_suppression(client, db_session):
    payload = {
        "type": "email.bounced",
        "data": {
            "email_id": "resend-msg-001",
            "to": ["bad@example.com"],
        },
    }
    resp = client.post(
        "/webhooks/resend",
        content=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200

    events = db_session.query(EmailEvent).all()
    assert len(events) == 1
    assert events[0].event_type == "bounce_hard"
    assert events[0].provider_message_id == "resend-msg-001"
    assert events[0].email_hash == _hash_email("bad@example.com")

    suppressions = db_session.query(EmailSuppression).all()
    assert len(suppressions) == 1
    assert suppressions[0].reason == "hard_bounce"


# ── Complaint → event + suppression ──


def test_complaint_creates_event_and_suppression(client, db_session):
    payload = {
        "type": "email.complained",
        "data": {
            "email_id": "resend-msg-002",
            "to": ["annoyed@example.com"],
        },
    }
    resp = client.post(
        "/webhooks/resend",
        content=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200

    events = db_session.query(EmailEvent).all()
    assert len(events) == 1
    assert events[0].event_type == "complaint"

    suppressions = db_session.query(EmailSuppression).all()
    assert len(suppressions) == 1
    assert suppressions[0].reason == "complaint"


# ── Duplicate suppression is idempotent ──


def test_duplicate_bounce_does_not_duplicate_suppression(client, db_session):
    payload = {
        "type": "email.bounced",
        "data": {
            "email_id": "resend-msg-003",
            "to": ["dup@example.com"],
        },
    }
    headers = {"Content-Type": "application/json"}

    client.post("/webhooks/resend", content=json.dumps(payload), headers=headers)
    client.post("/webhooks/resend", content=json.dumps(payload), headers=headers)

    suppressions = (
        db_session.query(EmailSuppression)
        .filter(EmailSuppression.email_hash == _hash_email("dup@example.com"))
        .all()
    )
    assert len(suppressions) == 1

    events = db_session.query(EmailEvent).all()
    assert len(events) == 2  # Two events logged


# ── Unhandled event type returns 200 ──


def test_unhandled_event_type_returns_200(client):
    payload = {
        "type": "email.delivered",
        "data": {"email_id": "resend-msg-004", "to": ["ok@example.com"]},
    }
    resp = client.post(
        "/webhooks/resend",
        content=json.dumps(payload),
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200


# ── Invalid JSON ──


def test_invalid_json_returns_400(client):
    resp = client.post(
        "/webhooks/resend",
        content="not json",
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 400
