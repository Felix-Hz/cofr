from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.jwt import verify_token
from app.database import get_db
from app.db.models import User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Verify JWT token and return user payload"""
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    return payload


async def get_user_id(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> str:
    """Extract user_id (internal DB ID) from authenticated user, rejecting soft-deleted users"""
    user_id = user["user_id"]
    exists = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found or deactivated",
        )
    return user_id
