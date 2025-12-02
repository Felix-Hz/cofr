from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import dispose_client
from app.middleware import log_requests
from app.routers import auth, expenses


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    yield
    await dispose_client()


app = FastAPI(
    title="Bezorgen - Expense Dashboard API",
    description="Read-only API for expense tracking with Telegram authentication",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Configure specific origins
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


app.include_router(auth.router)
app.include_router(expenses.router)
