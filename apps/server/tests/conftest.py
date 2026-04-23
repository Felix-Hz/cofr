import os

# Set dummy env vars BEFORE any app imports (database.py runs at import time)
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-key-at-least-32-chars-long")
os.environ.setdefault("ENCRYPTION_KEY", "yoiUSNghFamT5wyzMwk8YL2XS1T4uNg5Ih3k05CH51Q=")
os.environ.setdefault("ENV", "test")
os.environ["RESEND_API_KEY"] = ""  # Force ConsoleProvider in tests, never send real emails
os.environ["AWS_ACCESS_KEY_ID"] = ""
os.environ["AWS_SECRET_ACCESS_KEY"] = ""
os.environ["AWS_REGION"] = ""
os.environ["S3_BUCKET_NAME"] = ""

import uuid

import jwt as pyjwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Uuid as SaUuid
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Patch SaUuid so SQLite accepts string UUIDs (the app passes str everywhere;
# PostgreSQL handles this natively, but SQLite's bind processor calls .hex
# which only works on uuid.UUID objects).
_orig_bind_processor = SaUuid.bind_processor


def _patched_bind_processor(self, dialect):
    orig = _orig_bind_processor(self, dialect)
    if orig is None:
        return None

    def process(value):
        if isinstance(value, str):
            value = uuid.UUID(value)
        return orig(value)

    return process


SaUuid.bind_processor = _patched_bind_processor

from app.database import get_db  # noqa: E402
from app.db.models import Base, Category  # noqa: E402
from app.main import app  # noqa: E402

# In-memory SQLite for tests. StaticPool + check_same_thread=False
# ensures the same connection is shared across threads (required for
# FastAPI's async endpoints running in a thread pool).
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=test_engine)


@event.listens_for(test_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


# Override the DB dependency for all tests
app.dependency_overrides[get_db] = override_get_db

VALID_PASSWORD = "Test1234!"
SECOND_EMAIL = "user2@example.com"


def register_user(
    client: TestClient,
    email: str = "test@example.com",
    password: str = VALID_PASSWORD,
    name: str = "Test User",
) -> str:
    """Register a user via the real API and return the JWT token."""
    resp = client.post(
        "/auth/local/register", json={"email": email, "password": password, "name": name}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["token"]


@pytest.fixture(autouse=True)
def setup_test_db():
    """Create tables before each test and truncate after.

    With StaticPool the same connection is reused, so we can't just drop_all
    due to FK ordering issues. Instead we delete rows from all tables.
    """
    from app.email.rate_limit import email_rate_limiter
    from app.rate_limit import auth_rate_limiter

    auth_rate_limiter._store.clear()
    email_rate_limiter._store.clear()

    Base.metadata.create_all(bind=test_engine)
    yield
    # Truncate all tables with FK checks disabled (accounts↔users has a cycle)
    import warnings

    with TestSession() as session:
        session.execute(text("PRAGMA foreign_keys=OFF"))
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message="Cannot correctly sort tables")
            for table in Base.metadata.sorted_tables:
                session.execute(table.delete())
        session.execute(text("PRAGMA foreign_keys=ON"))
        session.commit()


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


@pytest.fixture
def auth_headers(client):
    """Register a user, return (headers_dict, user_id_str)."""
    token = register_user(client)
    payload = pyjwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    user_id = payload["user_id"]
    return {"Authorization": f"Bearer {token}"}, user_id


@pytest.fixture
def second_auth(client):
    """Register a second user, return (headers_dict, user_id_str)."""
    token = register_user(client, email=SECOND_EMAIL, name="Second User")
    payload = pyjwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    user_id = payload["user_id"]
    return {"Authorization": f"Bearer {token}"}, user_id


@pytest.fixture
def system_categories(db_session):
    """Insert minimum system categories needed by tests. Returns dict of slug→Category."""
    cats = {}
    specs = [
        ("Miscellaneous", "miscellaneous", "expense", 0),
        ("Food", "food", "expense", 1),
        ("Salary", "salary", "income", 2),
    ]
    for name, slug, cat_type, order in specs:
        cat = Category(
            user_id=None,
            name=name,
            slug=slug,
            color_light="#6B7280",
            color_dark="#9CA3AF",
            is_system=True,
            is_active=True,
            display_order=order,
            type=cat_type,
        )
        db_session.add(cat)
        cats[slug] = cat
    db_session.commit()
    for c in cats.values():
        db_session.refresh(c)
    return cats


def make_category(
    db_session,
    user_id: str,
    name: str = "Custom Cat",
    cat_type: str = "expense",
    slug: str | None = None,
) -> Category:
    """Create a custom category for a user. Returns the ORM object."""
    import re

    if slug is None:
        slug = re.sub(r"[^a-z0-9\s-]", "", name.lower().strip())
        slug = re.sub(r"[\s]+", "-", slug)
    cat = Category(
        user_id=user_id,
        name=name,
        slug=slug,
        color_light="#3B82F6",
        color_dark="#60A5FA",
        is_system=False,
        is_active=True,
        display_order=100,
        type=cat_type,
    )
    db_session.add(cat)
    db_session.commit()
    db_session.refresh(cat)
    return cat


@pytest.fixture
def sample_category(db_session, auth_headers):
    """A custom expense category belonging to the auth'd user."""
    _, user_id = auth_headers
    return make_category(db_session, user_id)


@pytest.fixture
def sample_income_category(db_session, auth_headers):
    """A custom income category belonging to the auth'd user."""
    _, user_id = auth_headers
    return make_category(
        db_session, user_id, name="Side Income", cat_type="income", slug="side-income"
    )
