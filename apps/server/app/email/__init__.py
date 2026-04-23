import logging

from app.config import settings
from app.email.provider import ConsoleProvider, EmailProvider, ResendProvider

logger = logging.getLogger(__name__)


def get_email_provider() -> EmailProvider:
    """Return Resend provider if API key is configured, otherwise Console for dev/test."""
    if settings.RESEND_API_KEY:
        if not settings.EMAIL_FROM_ADDRESS:
            logger.warning(
                "RESEND_API_KEY is set but EMAIL_FROM_ADDRESS is empty. "
                "Falling back to ConsoleProvider. Set EMAIL_FROM_ADDRESS to your verified sender address."
            )
            return ConsoleProvider()
        return ResendProvider(api_key=settings.RESEND_API_KEY)
    return ConsoleProvider()
