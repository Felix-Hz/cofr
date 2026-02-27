from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.auth.jwt import create_access_token
from app.config import settings
from app.database import get_db
from app.db.models import AuthProvider, User

router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])

oauth = OAuth()

# Register providers conditionally
if settings.GOOGLE_CLIENT_ID:
    oauth.register(
        name="google",
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

if settings.GITHUB_CLIENT_ID:
    oauth.register(
        name="github",
        client_id=settings.GITHUB_CLIENT_ID,
        client_secret=settings.GITHUB_CLIENT_SECRET,
        authorize_url="https://github.com/login/oauth/authorize",
        access_token_url="https://github.com/login/oauth/access_token",
        api_base_url="https://api.github.com/",
        client_kwargs={"scope": "user:email"},
    )

if settings.APPLE_CLIENT_ID:
    oauth.register(
        name="apple",
        client_id=settings.APPLE_CLIENT_ID,
        client_secret=settings.APPLE_CLIENT_SECRET,
        server_metadata_url="https://appleid.apple.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email name"},
    )

SUPPORTED_PROVIDERS = {"google", "github", "apple"}


def _get_registered_providers() -> set[str]:
    providers = set()
    if settings.GOOGLE_CLIENT_ID:
        providers.add("google")
    if settings.GITHUB_CLIENT_ID:
        providers.add("github")
    if settings.APPLE_CLIENT_ID:
        providers.add("apple")
    return providers


@router.get("/{provider}/login")
async def oauth_login(provider: str, request: Request):
    """Redirect to OAuth provider consent page"""
    if provider not in _get_registered_providers():
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error=Provider+{provider}+not+configured"
        )

    client = oauth.create_client(provider)
    redirect_uri = f"{settings.API_URL}/auth/oauth/{provider}/callback"
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/{provider}/callback")
async def oauth_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    """Handle OAuth callback, find/create user, issue JWT, redirect to frontend"""
    if provider not in _get_registered_providers():
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error=Provider+{provider}+not+configured"
        )

    client = oauth.create_client(provider)

    try:
        token = await client.authorize_access_token(request)
    except Exception:
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=OAuth+authorization+failed")

    # Extract user info based on provider
    provider_user_id, email, display_name = await _extract_user_info(provider, client, token)

    if not provider_user_id:
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/login?error=Could+not+retrieve+user+info"
        )

    # User resolution logic
    user = _resolve_user(db, provider, provider_user_id, email, display_name)

    # Create JWT
    jwt_token = create_access_token(user_id=user.id, username=display_name or "User")

    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback#token={jwt_token}")


async def _extract_user_info(
    provider: str, client, token: dict
) -> tuple[str | None, str | None, str | None]:
    """Extract provider_user_id, email, display_name from OAuth token/user info"""
    if provider == "google":
        userinfo = token.get("userinfo", {})
        return userinfo.get("sub"), userinfo.get("email"), userinfo.get("name")

    elif provider == "github":
        resp = await client.get("user", token=token)
        user_data = resp.json()
        provider_user_id = str(user_data.get("id", ""))
        email = user_data.get("email")
        display_name = user_data.get("name") or user_data.get("login")

        # GitHub may not return email in profile; fetch from /user/emails
        if not email:
            emails_resp = await client.get("user/emails", token=token)
            emails = emails_resp.json()
            for e in emails:
                if e.get("primary") and e.get("verified"):
                    email = e["email"]
                    break

        return provider_user_id, email, display_name

    elif provider == "apple":
        id_token = token.get("id_token", {})
        if isinstance(id_token, str):
            from jose import jwt as jose_jwt

            id_token = jose_jwt.get_unverified_claims(id_token)
        return id_token.get("sub"), id_token.get("email"), None

    return None, None, None


def _resolve_user(
    db: Session,
    provider: str,
    provider_user_id: str,
    email: str | None,
    display_name: str | None,
) -> User:
    """Find or create user from OAuth provider info"""
    # 1. Find user by exact provider match
    auth_provider = (
        db.query(AuthProvider)
        .filter(
            AuthProvider.provider == provider,
            AuthProvider.provider_user_id == provider_user_id,
        )
        .first()
    )
    if auth_provider:
        return db.query(User).filter(User.id == auth_provider.user_id).first()

    # 2. Find user by email match in auth_providers — auto-link
    if email:
        existing_provider = (
            db.query(AuthProvider).filter(AuthProvider.email == email).first()
        )
        if existing_provider:
            new_provider = AuthProvider(
                user_id=existing_provider.user_id,
                provider=provider,
                provider_user_id=provider_user_id,
                email=email,
                display_name=display_name,
            )
            db.add(new_provider)
            db.commit()
            return db.query(User).filter(User.id == existing_provider.user_id).first()

    # 3. Create new user + auth_provider
    # Generate unique username from email or provider info
    username = email if email else f"{provider}_{provider_user_id}"
    user = User(
        first_name=display_name or "",
        last_name="",
        username=username,
    )
    db.add(user)
    db.flush()

    new_provider = AuthProvider(
        user_id=user.id,
        provider=provider,
        provider_user_id=provider_user_id,
        email=email,
        display_name=display_name,
    )
    db.add(new_provider)
    db.commit()

    return user
