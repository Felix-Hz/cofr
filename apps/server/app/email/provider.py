import asyncio
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


class SESProvider:
    def __init__(self, access_key_id: str, secret_access_key: str, region: str):
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key
        self._region = region

    def _get_client(self):
        import boto3

        return boto3.client(
            "ses",
            aws_access_key_id=self._access_key_id,
            aws_secret_access_key=self._secret_access_key,
            region_name=self._region,
        )

    async def send(self, message: EmailMessage) -> bool:
        try:
            client = self._get_client()
            response = await asyncio.to_thread(
                client.send_email,
                Source=f"{message.from_name} <{message.from_address}>",
                Destination={"ToAddresses": [message.to]},
                Message={
                    "Subject": {"Data": message.subject, "Charset": "UTF-8"},
                    "Body": {"Html": {"Data": message.html_body, "Charset": "UTF-8"}},
                },
            )
            logger.info("SES email sent to %s, message_id=%s", message.to, response["MessageId"])
            return True
        except Exception:
            logger.exception("Failed to send email via SES to %s", message.to)
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
