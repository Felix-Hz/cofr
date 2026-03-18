"""Webhook tests: SNS notification parsing, bounce/complaint handling, suppression."""

import json

from app.db.models import EmailEvent, EmailSuppression
from app.routers.webhooks import _hash_email

# ── Hard bounce → event + suppression ──


def test_hard_bounce_creates_event_and_suppression(client, db_session):
    sns_message = {
        "notificationType": "Bounce",
        "bounce": {
            "bounceType": "Permanent",
            "bouncedRecipients": [{"emailAddress": "bad@example.com"}],
        },
        "mail": {"messageId": "ses-msg-001"},
    }
    payload = {
        "Type": "Notification",
        "Message": json.dumps(sns_message),
    }
    resp = client.post(
        "/webhooks/ses",
        content=json.dumps(payload),
        headers={
            "Content-Type": "application/json",
            "x-amz-sns-message-type": "Notification",
        },
    )
    assert resp.status_code == 200

    events = db_session.query(EmailEvent).all()
    assert len(events) == 1
    assert events[0].event_type == "bounce_hard"
    assert events[0].ses_message_id == "ses-msg-001"
    assert events[0].email_hash == _hash_email("bad@example.com")

    suppressions = db_session.query(EmailSuppression).all()
    assert len(suppressions) == 1
    assert suppressions[0].reason == "hard_bounce"


# ── Soft bounce → event only, no suppression ──


def test_soft_bounce_creates_event_but_no_suppression(client, db_session):
    sns_message = {
        "notificationType": "Bounce",
        "bounce": {
            "bounceType": "Transient",
            "bouncedRecipients": [{"emailAddress": "temp@example.com"}],
        },
        "mail": {"messageId": "ses-msg-002"},
    }
    payload = {
        "Type": "Notification",
        "Message": json.dumps(sns_message),
    }
    resp = client.post(
        "/webhooks/ses",
        content=json.dumps(payload),
        headers={
            "Content-Type": "application/json",
            "x-amz-sns-message-type": "Notification",
        },
    )
    assert resp.status_code == 200

    events = db_session.query(EmailEvent).all()
    assert len(events) == 1
    assert events[0].event_type == "bounce_soft"

    suppressions = db_session.query(EmailSuppression).all()
    assert len(suppressions) == 0


# ── Complaint → event + suppression ──


def test_complaint_creates_event_and_suppression(client, db_session):
    sns_message = {
        "notificationType": "Complaint",
        "complaint": {
            "complainedRecipients": [{"emailAddress": "annoyed@example.com"}],
        },
        "mail": {"messageId": "ses-msg-003"},
    }
    payload = {
        "Type": "Notification",
        "Message": json.dumps(sns_message),
    }
    resp = client.post(
        "/webhooks/ses",
        content=json.dumps(payload),
        headers={
            "Content-Type": "application/json",
            "x-amz-sns-message-type": "Notification",
        },
    )
    assert resp.status_code == 200

    events = db_session.query(EmailEvent).all()
    assert len(events) == 1
    assert events[0].event_type == "complaint"

    suppressions = db_session.query(EmailSuppression).all()
    assert len(suppressions) == 1
    assert suppressions[0].reason == "complaint"


# ── Duplicate suppression is idempotent ──


def test_duplicate_hard_bounce_does_not_duplicate_suppression(client, db_session):
    sns_message = {
        "notificationType": "Bounce",
        "bounce": {
            "bounceType": "Permanent",
            "bouncedRecipients": [{"emailAddress": "dup@example.com"}],
        },
        "mail": {"messageId": "ses-msg-004"},
    }
    payload = {
        "Type": "Notification",
        "Message": json.dumps(sns_message),
    }
    headers = {
        "Content-Type": "application/json",
        "x-amz-sns-message-type": "Notification",
    }

    client.post("/webhooks/ses", content=json.dumps(payload), headers=headers)
    client.post("/webhooks/ses", content=json.dumps(payload), headers=headers)

    suppressions = (
        db_session.query(EmailSuppression)
        .filter(EmailSuppression.email_hash == _hash_email("dup@example.com"))
        .all()
    )
    assert len(suppressions) == 1

    events = db_session.query(EmailEvent).all()
    assert len(events) == 2  # Two events logged


# ── Subscription confirmation ──


def test_subscription_confirmation_returns_200(client):
    payload = {
        "Type": "SubscriptionConfirmation",
        "SubscribeURL": "https://sns.ap-southeast-2.amazonaws.com/?Action=ConfirmSubscription&...",
    }
    resp = client.post(
        "/webhooks/ses",
        content=json.dumps(payload),
        headers={
            "Content-Type": "application/json",
            "x-amz-sns-message-type": "SubscriptionConfirmation",
        },
    )
    # Will fail to actually fetch the URL but should not error — returns 200
    assert resp.status_code == 200


# ── Invalid JSON ──


def test_invalid_json_returns_400(client):
    resp = client.post(
        "/webhooks/ses",
        content="not json",
        headers={
            "Content-Type": "application/json",
            "x-amz-sns-message-type": "Notification",
        },
    )
    assert resp.status_code == 400
