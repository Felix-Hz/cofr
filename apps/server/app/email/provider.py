import logging
from dataclasses import dataclass
from typing import Protocol

logger = logging.getLogger(__name__)


@dataclass
class EmailMessage:
    to: str
    subject: str
    html_body: str
    from_address: str
    from_name: str


class EmailProvider(Protocol):
    async def send(self, message: EmailMessage) -> bool: ...


class ResendProvider:
    def __init__(self, api_key: str):
        import resend

        resend.api_key = api_key
        self._resend = resend

    async def send(self, message: EmailMessage) -> bool:
        try:
            response = self._resend.Emails.send(
                {
                    "from": f"{message.from_name} <{message.from_address}>",
                    "to": [message.to],
                    "subject": message.subject,
                    "html": message.html_body,
                }
            )
            logger.info("Resend email sent to %s, id=%s", message.to, response["id"])
            return True
        except Exception:
            logger.exception("Failed to send email via Resend to %s", message.to)
            return False


class ConsoleProvider:
    async def send(self, message: EmailMessage) -> bool:
        logger.info(
            "📧 [ConsoleProvider] To: %s | Subject: %s\n%s",
            message.to,
            message.subject,
            message.html_body[:500],
        )
        return True
