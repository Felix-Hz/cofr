import hashlib
import logging

from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import EmailSuppression
from app.email import get_email_provider
from app.email.provider import EmailMessage
from app.email.templates import render_template
from app.email.tokens import generate_verification_token

logger = logging.getLogger(__name__)


def _hash_email(email: str) -> str:
    """SHA-256 hash of lowercased email for suppression lookups."""
    return hashlib.sha256(email.lower().strip().encode()).hexdigest()


def is_suppressed(db: Session, email: str) -> bool:
    """Check if an email address is on the suppression list."""
    email_hash = _hash_email(email)
    return (
        db.query(EmailSuppression).filter(EmailSuppression.email_hash == email_hash).first()
        is not None
    )


async def send_verification_email(db: Session, email: str, user_id: str) -> bool:
    """Send a verification email with a signed token link."""
    if is_suppressed(db, email):
        logger.info(
            "Skipping verification email to suppressed address (hash=%s)", _hash_email(email)[:12]
        )
        return False

    token = generate_verification_token(user_id, email)
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    html = render_template("verification", verify_url=verify_url)
    message = EmailMessage(
        to=email,
        subject="Verify your email — Cofr",
        html_body=html,
        from_address=settings.EMAIL_FROM_ADDRESS,
        from_name=settings.EMAIL_FROM_NAME,
    )

    provider = get_email_provider()
    return await provider.send(message)


async def send_welcome_email(email: str, name: str) -> bool:
    """Send a welcome email after successful verification."""
    html = render_template("welcome", name=name or "there")
    message = EmailMessage(
        to=email,
        subject="Welcome to Cofr!",
        html_body=html,
        from_address=settings.EMAIL_FROM_ADDRESS,
        from_name=settings.EMAIL_FROM_NAME,
    )

    provider = get_email_provider()
    return await provider.send(message)
