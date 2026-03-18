from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import settings

_serializer = URLSafeTimedSerializer(settings.JWT_SECRET)

VERIFICATION_MAX_AGE = 86400  # 24 hours


def generate_verification_token(user_id: str, email: str) -> str:
    """Generate a URL-safe signed token for email verification."""
    return _serializer.dumps({"user_id": user_id, "email": email, "purpose": "verify"})


def validate_verification_token(token: str) -> dict:
    """Validate and decode a verification token.

    Returns the payload dict on success.
    Raises SignatureExpired if token is older than 24h.
    Raises BadSignature if token is tampered or invalid.
    """
    return _serializer.loads(token, max_age=VERIFICATION_MAX_AGE)


__all__ = [
    "generate_verification_token",
    "validate_verification_token",
    "SignatureExpired",
    "BadSignature",
]
