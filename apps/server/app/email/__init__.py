from app.config import settings
from app.email.provider import ConsoleProvider, EmailProvider, SESProvider


def get_email_provider() -> EmailProvider:
    """Return SES provider if credentials are configured, otherwise Console for dev/test."""
    if settings.AWS_SES_ACCESS_KEY_ID:
        return SESProvider(
            access_key_id=settings.AWS_SES_ACCESS_KEY_ID,
            secret_access_key=settings.AWS_SES_SECRET_ACCESS_KEY,
            region=settings.AWS_SES_REGION,
        )
    return ConsoleProvider()
