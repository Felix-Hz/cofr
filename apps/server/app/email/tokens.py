import hashlib

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import settings

_serializer = URLSafeTimedSerializer(settings.JWT_SECRET)

VERIFICATION_MAX_AGE = 86400  # 24 hours
RESET_PASSWORD_MAX_AGE = 3600  # 1 hour


def _password_fingerprint(password_hash: str) -> str:
    return hashlib.sha256(password_hash.encode()).hexdigest()


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


def generate_password_reset_token(user_id: str, email: str, password_hash: str) -> str:
    """Generate a signed token for password reset."""
    return _serializer.dumps(
        {
            "user_id": user_id,
            "email": email,
            "purpose": "reset_password",
            "password_fingerprint": _password_fingerprint(password_hash),
        }
    )


def validate_password_reset_token(token: str) -> dict:
    """Validate and decode a password reset token."""
    return _serializer.loads(token, max_age=RESET_PASSWORD_MAX_AGE)


def password_reset_token_matches(password_hash: str, token_payload: dict) -> bool:
    return token_payload.get("password_fingerprint") == _password_fingerprint(password_hash)


__all__ = [
    "generate_verification_token",
    "validate_verification_token",
    "generate_password_reset_token",
    "validate_password_reset_token",
    "password_reset_token_matches",
    "RESET_PASSWORD_MAX_AGE",
    "SignatureExpired",
    "BadSignature",
]
