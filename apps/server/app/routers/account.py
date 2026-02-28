from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.auth.telegram import verify_telegram_auth
from app.config import settings
from app.database import get_db
from app.db.models import AuthProvider, User
from app.db.schemas import TelegramAuthRequest

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


@router.post("/link/telegram", response_model=ProviderResponse)
async def link_telegram(
    data: TelegramAuthRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Link Telegram account to authenticated user"""
    auth_data = {
        "id": data.id,
        "first_name": data.first_name,
        "auth_date": str(data.auth_date),
        "hash": data.hash,
    }
    if data.last_name:
        auth_data["last_name"] = data.last_name
    if data.username:
        auth_data["username"] = data.username
    if data.photo_url:
        auth_data["photo_url"] = data.photo_url

    if not verify_telegram_auth(auth_data, settings.TELEGRAM_BOT_TOKEN):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram authentication",
        )

    telegram_id_str = str(data.id)

    # Check if this Telegram ID is already linked to another account
    existing = (
        db.query(AuthProvider)
        .filter(
            AuthProvider.provider == "telegram",
            AuthProvider.provider_user_id == telegram_id_str,
        )
        .first()
    )
    if existing:
        if existing.user_id == user_id:
            raise HTTPException(status_code=400, detail="Telegram already linked to this account")
        raise HTTPException(
            status_code=409, detail="Telegram account already linked to another user"
        )

    # Also update the user's telegram user_id for backward compatibility with remind0
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.user_id = data.id

    provider = AuthProvider(
        user_id=user_id,
        provider="telegram",
        provider_user_id=telegram_id_str,
        display_name=data.username or data.first_name,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)

    return ProviderResponse(
        id=str(provider.id),
        provider=provider.provider,
        provider_user_id=provider.provider_user_id,
        email=provider.email,
        display_name=provider.display_name,
    )
