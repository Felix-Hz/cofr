import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.database import engine
from app.middleware import log_requests
from app.routers import account, exchange_rates, expenses, local_auth, oauth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    from app.database import SessionLocal
    from app.services.exchange_rates import refresh_rates_in_db

    # Initial refresh on startup
    refresh_rates_in_db(SessionLocal())
    # Schedule daily refresh
    task = asyncio.create_task(_daily_rates_refresh_loop())
    yield
    task.cancel()
    engine.dispose()


async def _daily_rates_refresh_loop():
    """Refresh exchange rates every 24 hours."""
    from app.database import SessionLocal
    from app.services.exchange_rates import refresh_rates_in_db

    while True:
        await asyncio.sleep(86400)
        refresh_rates_in_db(SessionLocal())


app = FastAPI(
    title="Cofr — Expense Dashboard API",
    description="API for expense tracking with Google OAuth and Telegram bot integration",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging for debugging
app.middleware("http")(log_requests)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "version": "1.0.0"}


app.include_router(expenses.router)
app.include_router(oauth.router)
app.include_router(account.router)
app.include_router(exchange_rates.router)
app.include_router(local_auth.router)
