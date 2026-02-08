from urllib.parse import parse_qs, urlparse

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings


def _build_connection_url() -> str:
    parsed = urlparse(settings.TURSO_DATABASE_URL)
    host = parsed.hostname or ""
    port = f":{parsed.port}" if parsed.port else ""
    path = parsed.path or ""

    # Existing query params (exclude any authToken — passed via connect_args)
    existing_params = parse_qs(parsed.query)

    params = ["secure=true"]

    for key, values in existing_params.items():
        if key == "authToken":
            continue
        for value in values:
            params.append(f"{key}={value}")

    query_string = "&".join(params)
    return f"sqlite+libsql://{host}{port}{path}?{query_string}"


engine = create_engine(
    _build_connection_url(),
    echo=False,
    connect_args={
        "auth_token": settings.TURSO_AUTH_TOKEN,
        "check_same_thread": False,  # Allow connection sharing across threads
    },
    poolclass=StaticPool,  # Single persistent connection with proper locking
)
SessionLocal = sessionmaker(bind=engine)


def get_db():
    """FastAPI dependency for database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
