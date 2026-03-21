import asyncio
import logging

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.auth.jwt import create_access_token
from app.config import settings
from app.database import get_db
from app.db.models import AuthProvider, User
from app.email.rate_limit import email_rate_limiter
from app.email.service import send_verification_email, send_welcome_email
from app.email.tokens import BadSignature, SignatureExpired, validate_verification_token
from app.services.account_service import ensure_system_accounts

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/local", tags=["Local Auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(not c.isalnum() for c in v):
            raise ValueError("Password must contain at least one special character")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new account with email and password."""
    email_normalized = body.email.lower().strip()

    existing = (
        db.query(AuthProvider)
        .filter(
            AuthProvider.provider == "local",
            AuthProvider.provider_user_id == email_normalized,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        first_name=body.name or "",
        last_name="",
        username=email_normalized,
    )
    db.add(user)
    db.flush()

    auth_provider = AuthProvider(
        user_id=user.id,
        provider="local",
        provider_user_id=email_normalized,
        email=email_normalized,
        display_name=body.name,
        password_hash=_hash_password(body.password),
    )
    db.add(auth_provider)
    ensure_system_accounts(db, user)
    db.commit()

    # Fire-and-forget verification email
    asyncio.create_task(send_verification_email(db, email_normalized, str(user.id)))

    token = create_access_token(user_id=str(user.id), username=body.name or email_normalized)
    return AuthResponse(token=token)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Log in with email and password."""
    email_normalized = body.email.lower().strip()

    auth_provider = (
        db.query(AuthProvider)
        .filter(
            AuthProvider.provider == "local",
            AuthProvider.provider_user_id == email_normalized,
        )
        .first()
    )

    if not auth_provider or not auth_provider.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not _verify_password(body.password, auth_provider.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user = db.query(User).filter(User.id == auth_provider.user_id).first()
    if user.deleted_at is not None:
        user.deleted_at = None
        db.commit()
    token = create_access_token(
        user_id=str(user.id),
        username=auth_provider.display_name or email_normalized,
    )
    return AuthResponse(token=token)


@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify email address from the link sent in the verification email."""
    try:
        payload = validate_verification_token(token)
    except SignatureExpired:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?verified=expired", status_code=302
        )
    except BadSignature:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?verified=invalid", status_code=302
        )

    user_id = payload["user_id"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?verified=invalid", status_code=302
        )

    if not user.email_verified:
        user.email_verified = True
        db.commit()
        # Fire-and-forget welcome email
        asyncio.create_task(send_welcome_email(payload["email"], user.first_name))

    return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?verified=true", status_code=302)


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
async def resend_verification(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
):
    """Resend verification email (authenticated, rate-limited)."""
    user = db.query(User).filter(User.id == user_id).first()
    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified"
        )

    # Get email from auth provider
    auth_provider = (
        db.query(AuthProvider)
        .filter(AuthProvider.user_id == user_id, AuthProvider.provider == "local")
        .first()
    )
    if not auth_provider or not auth_provider.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No email address associated with this account",
        )

    email = auth_provider.email
    if not email_rate_limiter.check(email, max_count=5, window_seconds=3600):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification emails. Please try again later.",
        )

    asyncio.create_task(send_verification_email(db, email, user_id))
    return {"message": "Verification email sent"}
