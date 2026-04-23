import hashlib
import json
import logging

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.db.models import EmailEvent, EmailSuppression

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def _hash_email(email: str) -> str:
    return hashlib.sha256(email.lower().strip().encode()).hexdigest()


def _verify_webhook_signature(request: Request, body: bytes) -> bool:
    """Verify Resend webhook signature using Svix."""
    secret = settings.RESEND_WEBHOOK_SECRET
    if not secret:
        logger.warning("RESEND_WEBHOOK_SECRET not configured, rejecting webhook")
        return False

    try:
        from svix.webhooks import Webhook

        wh = Webhook(secret)
        headers = {
            "svix-id": request.headers.get("svix-id", ""),
            "svix-timestamp": request.headers.get("svix-timestamp", ""),
            "svix-signature": request.headers.get("svix-signature", ""),
        }
        wh.verify(body, headers)
        return True
    except Exception:
        logger.warning("Resend webhook signature verification failed")
        return False


def _process_bounce(db: Session, data: dict, raw_payload: str) -> None:
    email = data.get("to", [""])[0] if isinstance(data.get("to"), list) else data.get("to", "")
    if not email:
        return

    email_hash = _hash_email(email)
    provider_message_id = data.get("email_id")

    db.add(
        EmailEvent(
            email_hash=email_hash,
            event_type="bounce_hard",
            provider_message_id=provider_message_id,
            raw_payload=raw_payload,
        )
    )

    existing = db.query(EmailSuppression).filter(EmailSuppression.email_hash == email_hash).first()
    if not existing:
        db.add(EmailSuppression(email_hash=email_hash, reason="hard_bounce"))

    db.commit()


def _process_complaint(db: Session, data: dict, raw_payload: str) -> None:
    email = data.get("to", [""])[0] if isinstance(data.get("to"), list) else data.get("to", "")
    if not email:
        return

    email_hash = _hash_email(email)
    provider_message_id = data.get("email_id")

    db.add(
        EmailEvent(
            email_hash=email_hash,
            event_type="complaint",
            provider_message_id=provider_message_id,
            raw_payload=raw_payload,
        )
    )

    existing = db.query(EmailSuppression).filter(EmailSuppression.email_hash == email_hash).first()
    if not existing:
        db.add(EmailSuppression(email_hash=email_hash, reason="complaint"))

    db.commit()


@router.post("/resend", status_code=status.HTTP_200_OK)
async def resend_webhook(request: Request, db: Session = Depends(get_db)) -> Response:
    """Handle Resend webhook events for bounces and complaints."""
    body = await request.body()
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return Response(status_code=status.HTTP_400_BAD_REQUEST)

    if not _verify_webhook_signature(request, body):
        return Response(status_code=status.HTTP_401_UNAUTHORIZED)

    event_type = payload.get("type", "")
    data = payload.get("data", {})
    raw_payload = body.decode("utf-8", errors="replace")

    if event_type == "email.bounced":
        _process_bounce(db, data, raw_payload)
    elif event_type == "email.complained":
        _process_complaint(db, data, raw_payload)
    else:
        logger.info("Ignoring Resend event type: %s", event_type)

    return Response(status_code=status.HTTP_200_OK)
