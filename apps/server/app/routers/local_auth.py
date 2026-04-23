import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.auth.jwt import create_access_token
from app.auth.passwords import hash_password, validate_password_strength, verify_password
from app.config import settings
from app.database import get_db
from app.db.models import AuthProvider, User
from app.email.rate_limit import email_rate_limiter
from app.email.service import (
    send_password_reset_email,
    send_verification_email,
    send_welcome_email,
)
from app.email.tokens import (
    BadSignature,
    SignatureExpired,
    password_reset_token_matches,
    validate_password_reset_token,
    validate_verification_token,
)
from app.rate_limit import auth_rate_limiter
from app.services.account_service import ensure_system_accounts

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/local", tags=["Local Auth"])


def _client_ip(request: Request) -> str:
    # X-Real-IP is set by Caddy to the real connection IP (selfhost/dev, not spoofable by clients)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    # CF-Connecting-IP is set by Cloudflare (prod deployment behind cloudflared)
    cf = request.headers.get("CF-Connecting-IP")
    if cf:
        return cf.strip()
    return request.client.host if request.client else "unknown"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new account with email and password."""
    ip = _client_ip(request)
    if not auth_rate_limiter.check(f"register:ip:{ip}", max_count=3, window_seconds=3600):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Please try again later.",
        )

    if not settings.REGISTRATION_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is disabled on this instance.",
        )

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
        password_hash=hash_password(body.password),
    )
    db.add(auth_provider)
    ensure_system_accounts(db, user)
    db.commit()

    # Fire-and-forget verification email
    asyncio.create_task(send_verification_email(db, email_normalized, str(user.id)))

    token = create_access_token(user_id=str(user.id), username=body.name or email_normalized)
    return AuthResponse(token=token)


@router.post("/login", response_model=AuthResponse)
async def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """Log in with email and password."""
    email_normalized = body.email.lower().strip()
    ip = _client_ip(request)

    # Per-IP: all attempts count — 20 per 15 min guards against credential stuffing
    if not auth_rate_limiter.check(f"login:ip:{ip}", max_count=20, window_seconds=900):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )

    # Per-account: peek without recording — only failed password checks count (OWASP standard)
    account_key = f"login:email:{email_normalized}"
    if not auth_rate_limiter.is_allowed(account_key, max_count=5, window_seconds=900):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts for this account. Please try again later.",
        )

    auth_provider = (
        db.query(AuthProvider)
        .filter(
            AuthProvider.provider == "local",
            AuthProvider.provider_user_id == email_normalized,
        )
        .first()
    )

    if not auth_provider or not auth_provider.password_hash:
        auth_rate_limiter.record(account_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(body.password, auth_provider.password_hash):
        auth_rate_limiter.record(account_key)
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


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password reset email for a verified local account."""
    email_normalized = body.email.lower().strip()
    if not email_rate_limiter.check(f"reset:{email_normalized}", max_count=5, window_seconds=3600):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset requests. Please try again later.",
        )

    auth_provider = (
        db.query(AuthProvider)
        .filter(
            AuthProvider.provider == "local",
            AuthProvider.provider_user_id == email_normalized,
        )
        .first()
    )

    if auth_provider and auth_provider.password_hash:
        user = db.query(User).filter(User.id == auth_provider.user_id).first()
        if user and user.email_verified and auth_provider.email:
            asyncio.create_task(
                send_password_reset_email(
                    db,
                    auth_provider.email,
                    str(user.id),
                    auth_provider.password_hash,
                )
            )

    return {
        "message": "If that account exists and is eligible for reset, we've sent a reset email."
    }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password from a signed password reset link."""
    try:
        payload = validate_password_reset_token(body.token)
    except SignatureExpired as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link has expired",
        ) from exc
    except BadSignature as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link is invalid",
        ) from exc

    if payload.get("purpose") != "reset_password":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset link is invalid")

    user_id = payload["user_id"]
    email = payload["email"]
    auth_provider = (
        db.query(AuthProvider)
        .filter(
            AuthProvider.user_id == user_id,
            AuthProvider.provider == "local",
            AuthProvider.provider_user_id == email,
        )
        .first()
    )
    user = db.query(User).filter(User.id == user_id).first()

    if (
        not user
        or not auth_provider
        or not auth_provider.password_hash
        or not user.email_verified
        or not password_reset_token_matches(auth_provider.password_hash, payload)
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset link is invalid")

    auth_provider.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Password reset successfully"}


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
