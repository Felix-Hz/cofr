from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings

_kwargs = dict(echo=False, pool_pre_ping=True)

if not settings.DATABASE_URL.startswith("sqlite"):
    _kwargs.update(pool_size=5, max_overflow=10)

engine = create_engine(settings.DATABASE_URL, **_kwargs)
SessionLocal = sessionmaker(bind=engine)


def get_db():
    """FastAPI dependency for database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
