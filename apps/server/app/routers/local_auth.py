import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from app.auth.jwt import create_access_token
from app.database import get_db
from app.db.models import AuthProvider, User

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
    db.commit()

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
