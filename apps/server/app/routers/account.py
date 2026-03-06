import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.config import settings
from app.database import get_db
from app.db.models import AuthProvider, User

router = APIRouter(prefix="/account", tags=["Account"])


class ProviderResponse(BaseModel):
    id: str
    provider: str
    provider_user_id: str
    email: str | None
    display_name: str | None


class UnlinkResponse(BaseModel):
    success: bool
    message: str


class PreferencesResponse(BaseModel):
    preferred_currency: str


class PreferencesUpdate(BaseModel):
    preferred_currency: str


class TelegramLinkInitResponse(BaseModel):
    code: str
    deep_link: str


class ProfileResponse(BaseModel):
    preferred_currency: str


class CurrencyUpdateRequest(BaseModel):
    preferred_currency: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
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


class PasswordChangeResponse(BaseModel):
    success: bool
    message: str


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Get the current user's profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ProfileResponse(preferred_currency=user.preferred_currency)


@router.put("/profile/currency", response_model=ProfileResponse)
async def update_preferred_currency(
    body: CurrencyUpdateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Update the user's preferred currency."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.preferred_currency = body.preferred_currency
    db.commit()
    return ProfileResponse(preferred_currency=user.preferred_currency)


@router.get("/providers", response_model=list[ProviderResponse])
async def get_linked_providers(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """List all linked auth providers for the current user"""
    providers = db.query(AuthProvider).filter(AuthProvider.user_id == user_id).all()
    return [
        ProviderResponse(
            id=str(p.id),
            provider=p.provider,
            provider_user_id=p.provider_user_id,
            email=p.email,
            display_name=p.display_name,
        )
        for p in providers
    ]


@router.delete("/providers/{provider_id}", response_model=UnlinkResponse)
async def unlink_provider(
    provider_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Unlink an auth provider (must keep at least 1)"""
    provider = (
        db.query(AuthProvider)
        .filter(AuthProvider.id == provider_id, AuthProvider.user_id == user_id)
        .first()
    )
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    # Must keep at least one provider
    count = db.query(AuthProvider).filter(AuthProvider.user_id == user_id).count()
    if count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot unlink last provider. Link another provider first.",
        )

    db.delete(provider)
    db.commit()
    return UnlinkResponse(success=True, message="Provider unlinked successfully")


@router.post("/link/telegram/init", response_model=TelegramLinkInitResponse)
async def init_telegram_link(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Generate a deep-link code for Telegram account linking"""
    # Check if already linked
    existing = (
        db.query(AuthProvider)
        .filter(AuthProvider.user_id == user_id, AuthProvider.provider == "telegram")
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Telegram already linked to this account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    code = secrets.token_urlsafe(6)
    user.link_code = code
    user.link_code_expires = datetime.now(UTC) + timedelta(minutes=10)
    db.commit()

    deep_link = f"https://t.me/{settings.TELEGRAM_BOT_NAME}?start={code}"

    return TelegramLinkInitResponse(code=code, deep_link=deep_link)


@router.get("/preferences", response_model=PreferencesResponse)
async def get_preferences(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Get user preferences"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return PreferencesResponse(preferred_currency=user.preferred_currency)


@router.put("/preferences", response_model=PreferencesResponse)
async def update_preferences(
    data: PreferencesUpdate,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Update user preferences"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.preferred_currency = data.preferred_currency
    db.commit()
    return PreferencesResponse(preferred_currency=user.preferred_currency)


@router.put("/password", response_model=PasswordChangeResponse)
async def change_password(
    body: PasswordChangeRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Change password for local (email/password) auth."""
    auth_provider = (
        db.query(AuthProvider)
        .filter(AuthProvider.user_id == user_id, AuthProvider.provider == "local")
        .first()
    )
    if not auth_provider or not auth_provider.password_hash:
        raise HTTPException(status_code=400, detail="No local auth provider linked to this account")

    if not bcrypt.checkpw(body.current_password.encode(), auth_provider.password_hash.encode()):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    auth_provider.password_hash = bcrypt.hashpw(
        body.new_password.encode(), bcrypt.gensalt()
    ).decode()
    db.commit()
    return PasswordChangeResponse(success=True, message="Password changed successfully")
