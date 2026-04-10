import asyncio
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.database import engine
from app.middleware import log_requests
from app.routers import (
    account,
    accounts,
    categories,
    dashboard,
    exchange_rates,
    expenses,
    exports,
    local_auth,
    oauth,
    transfers,
    webhooks,
)


def _traces_sampler(sampling_context: dict) -> float:
    if sampling_context.get("asgi_scope", {}).get("path") == "/health":
        return 0.0
    return 0.02


if settings.ENV == "production" and settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment="production",
        sample_rate=1.0,
        traces_sampler=_traces_sampler,
        send_default_pii=False,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    from app.database import SessionLocal
    from app.services.exchange_rates import refresh_rates_in_db

    # Initial refresh on startup
    refresh_rates_in_db(SessionLocal())
    # Schedule daily refresh
    task = asyncio.create_task(_daily_rates_refresh_loop())
    cleanup_task = asyncio.create_task(_export_cleanup_loop())
    yield
    task.cancel()
    cleanup_task.cancel()
    engine.dispose()


async def _daily_rates_refresh_loop():
    """Refresh exchange rates every 24 hours."""
    from app.database import SessionLocal
    from app.services.exchange_rates import refresh_rates_in_db

    while True:
        await asyncio.sleep(86400)
        refresh_rates_in_db(SessionLocal())


async def _export_cleanup_loop():
    """Clean up expired export jobs every 5 minutes."""
    from app.services.export_service import cleanup_expired_jobs

    while True:
        await asyncio.sleep(300)
        cleanup_expired_jobs()


app = FastAPI(
    title="Cofr — Expense Dashboard API",
    description="API for expense tracking with Google OAuth",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.JWT_SECRET,
    https_only=settings.ENV != "local",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["baggage", "sentry-trace"],
)

# Add request logging for debugging
app.middleware("http")(log_requests)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "version": "1.0.0"}


app.include_router(expenses.router)
app.include_router(categories.router)
app.include_router(oauth.router)
app.include_router(account.router)
app.include_router(accounts.router)
app.include_router(transfers.router)
app.include_router(exchange_rates.router)
app.include_router(local_auth.router)
app.include_router(webhooks.router)
app.include_router(exports.router)
app.include_router(dashboard.router)
