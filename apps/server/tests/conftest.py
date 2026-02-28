import os

# Set dummy env vars BEFORE any app imports (database.py runs at import time)
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF-dummy")
os.environ.setdefault("JWT_SECRET", "test-secret-key-at-least-32-chars-long")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import get_db
from app.db.models import Base
from app.main import app

# In-memory SQLite for tests
test_engine = create_engine("sqlite:///:memory:")
TestSession = sessionmaker(bind=test_engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


# Override the DB dependency for all tests
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_test_db():
    """Create tables before each test and drop after"""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    """Test client with in-memory DB"""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Direct DB session for test setup/assertions"""
    db = TestSession()
    try:
        yield db
    finally:
        db.close()
