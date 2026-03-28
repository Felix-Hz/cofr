"""S3 client for export file storage.

Lazy singleton - the boto3 client is created on first use and reused across threads
(boto3 clients are thread-safe via internal urllib3 connection pooling).

When AWS credentials are absent (dev/test), all operations gracefully degrade:
`is_s3_available()` returns False, and the export flow falls back to temp files.
"""

from app.config import settings

_client = None

MEDIA_TYPES = {
    "csv": "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
    "zip": "application/zip",
}


def is_s3_available() -> bool:
    return bool(settings.AWS_ACCESS_KEY_ID and settings.S3_BUCKET_NAME)


def _get_client():
    global _client
    if _client is None:
        import boto3

        _client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
    return _client


def upload(key: str, data: bytes, content_type: str) -> None:
    _get_client().put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=data,
        ContentType=content_type,
    )


def delete(key: str) -> None:
    _get_client().delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)


def presign_download(key: str, filename: str, expires_in: int = 3600) -> str:
    return _get_client().generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.S3_BUCKET_NAME,
            "Key": key,
            "ResponseContentDisposition": f'attachment; filename="{filename}"',
        },
        ExpiresIn=expires_in,
    )
