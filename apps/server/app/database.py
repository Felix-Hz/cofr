import libsql_client

from app.config import settings

# Create libsql client for Turso
client = libsql_client.create_client_sync(
    url=settings.TURSO_DATABASE_URL, auth_token=settings.TURSO_AUTH_TOKEN
)


async def get_db():
    """FastAPI dependency for database client"""
    return client


async def dispose_client():
    """Close client on shutdown"""
    client.close()
