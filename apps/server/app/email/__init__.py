from app.config import settings
from app.email.provider import ConsoleProvider, EmailProvider, ResendProvider


def get_email_provider() -> EmailProvider:
    """Return Resend provider if API key is configured, otherwise Console for dev/test."""
    if settings.RESEND_API_KEY:
        return ResendProvider(api_key=settings.RESEND_API_KEY)
    return ConsoleProvider()
