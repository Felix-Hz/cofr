from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.database import engine
from app.middleware import log_requests
from app.routers import account, expenses, oauth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    yield
    engine.dispose()


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
