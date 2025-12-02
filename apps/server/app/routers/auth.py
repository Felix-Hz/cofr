from fastapi import APIRouter, HTTPException, status

from app.auth.jwt import create_access_token
from app.auth.telegram import verify_telegram_auth
from app.config import settings
from app.db.schemas import TelegramAuthRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/telegram", response_model=TokenResponse)
async def telegram_callback(data: TelegramAuthRequest):
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

    # Create JWT token
    token = create_access_token(
        telegram_id=data.id,
        username=data.username or data.first_name,
    )

    return TokenResponse(access_token=token)
