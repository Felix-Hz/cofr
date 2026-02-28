from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt

from app.config import settings


def create_access_token(user_id: str, username: str) -> str:
    """Create JWT access token with 24-hour expiration"""
    expire = datetime.now(UTC) + timedelta(hours=24)
    to_encode = {"user_id": user_id, "username": username, "exp": expire}
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")


def verify_token(token: str) -> dict | None:
    """Verify JWT token and return payload"""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        return None
