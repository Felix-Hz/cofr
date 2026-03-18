import hashlib
import json
import logging

import httpx
from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.db.models import EmailEvent, EmailSuppression

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def _hash_email(email: str) -> str:
    return hashlib.sha256(email.lower().strip().encode()).hexdigest()


def _process_bounce(db: Session, message: dict, raw_payload: str) -> None:
    bounce = message.get("bounce", {})
    bounce_type = bounce.get("bounceType", "")
    ses_message_id = message.get("mail", {}).get("messageId")

    for recipient in bounce.get("bouncedRecipients", []):
        email = recipient.get("emailAddress", "")
        email_hash = _hash_email(email)

        event_type = "bounce_hard" if bounce_type == "Permanent" else "bounce_soft"
        db.add(
            EmailEvent(
                email_hash=email_hash,
                event_type=event_type,
                ses_message_id=ses_message_id,
                raw_payload=raw_payload,
            )
        )

        if bounce_type == "Permanent":
            existing = (
                db.query(EmailSuppression).filter(EmailSuppression.email_hash == email_hash).first()
            )
            if not existing:
                db.add(EmailSuppression(email_hash=email_hash, reason="hard_bounce"))

    db.commit()


def _process_complaint(db: Session, message: dict, raw_payload: str) -> None:
    complaint = message.get("complaint", {})
    ses_message_id = message.get("mail", {}).get("messageId")

    for recipient in complaint.get("complainedRecipients", []):
        email = recipient.get("emailAddress", "")
        email_hash = _hash_email(email)

        db.add(
            EmailEvent(
                email_hash=email_hash,
                event_type="complaint",
                ses_message_id=ses_message_id,
                raw_payload=raw_payload,
            )
        )

        existing = (
            db.query(EmailSuppression).filter(EmailSuppression.email_hash == email_hash).first()
        )
        if not existing:
            db.add(EmailSuppression(email_hash=email_hash, reason="complaint"))

    db.commit()


@router.post("/ses", status_code=status.HTTP_200_OK)
async def ses_webhook(request: Request, db: Session = Depends(get_db)) -> Response:
    """Handle SNS notifications for SES bounces and complaints."""
    body = await request.body()
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return Response(status_code=status.HTTP_400_BAD_REQUEST)

    message_type = request.headers.get("x-amz-sns-message-type", "")

    # Handle subscription confirmation
    if message_type == "SubscriptionConfirmation":
        subscribe_url = payload.get("SubscribeURL")
        if subscribe_url:
            logger.info("Confirming SNS subscription: %s", subscribe_url)
            async with httpx.AsyncClient() as client:
                await client.get(subscribe_url)
        return Response(status_code=status.HTTP_200_OK)

    # Handle notifications
    if message_type == "Notification":
        raw_message = payload.get("Message", "")
        try:
            message = json.loads(raw_message)
        except json.JSONDecodeError:
            logger.warning("Failed to parse SNS notification Message as JSON")
            return Response(status_code=status.HTTP_400_BAD_REQUEST)

        notification_type = message.get("notificationType", "")
        if notification_type == "Bounce":
            _process_bounce(db, message, raw_message)
        elif notification_type == "Complaint":
            _process_complaint(db, message, raw_message)
        else:
            logger.info("Ignoring SES notification type: %s", notification_type)

    return Response(status_code=status.HTTP_200_OK)
