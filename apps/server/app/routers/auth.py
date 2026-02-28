from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.jwt import create_access_token
from app.auth.telegram import verify_telegram_auth
from app.config import settings
from app.database import get_db
from app.db.models import AuthProvider, User
from app.db.schemas import TelegramAuthRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/telegram", response_model=TokenResponse)
async def telegram_callback(data: TelegramAuthRequest, db: Session = Depends(get_db)):
    """Verify Telegram Login Widget authentication and return JWT"""
    # Convert Pydantic model to dict for verification
    auth_data = {
        "id": data.id,
        "first_name": data.first_name,
        "auth_date": str(data.auth_date),
        "hash": data.hash,
    }

    # Add optional fields if present
    if data.last_name:
        auth_data["last_name"] = data.last_name
    if data.username:
        auth_data["username"] = data.username
    if data.photo_url:
        auth_data["photo_url"] = data.photo_url

    # Verify Telegram signature
    if not verify_telegram_auth(auth_data, settings.TELEGRAM_BOT_TOKEN):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram authentication",
        )

    telegram_id_str = str(data.id)

    # Look up user by auth_providers table
    auth_provider = (
        db.query(AuthProvider)
        .filter(
            AuthProvider.provider == "telegram", AuthProvider.provider_user_id == telegram_id_str
        )
        .first()
    )

    if auth_provider:
        user = db.query(User).filter(User.id == auth_provider.user_id).first()
    else:
        # Check if user exists by telegram user_id (legacy path)
        user = db.query(User).filter(User.user_id == data.id).first()
        if user:
            # Create auth_provider record for existing user
            auth_provider = AuthProvider(
                user_id=user.id,
                provider="telegram",
                provider_user_id=telegram_id_str,
                display_name=data.username or data.first_name,
            )
            db.add(auth_provider)
            db.commit()
        else:
            # Create new user + auth_provider
            user = User(
                user_id=data.id,
                first_name=data.first_name,
                last_name=data.last_name or "",
                username=data.username or "",
            )
            db.add(user)
            db.flush()  # Get user.id

            auth_provider = AuthProvider(
                user_id=user.id,
                provider="telegram",
                provider_user_id=telegram_id_str,
                display_name=data.username or data.first_name,
            )
            db.add(auth_provider)
            db.commit()

    # Create JWT token with internal user ID
    token = create_access_token(
        user_id=str(user.id),
        username=data.username or data.first_name,
    )

    return TokenResponse(access_token=token)
