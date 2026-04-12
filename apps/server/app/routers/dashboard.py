from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.database import get_db
from app.db.schemas import (
    AccountTrendResponse,
    DashboardLayoutResponse,
    DashboardLayoutUpdate,
    MonthlyTrendResponse,
    RecurringResponse,
    WeekdayHeatmapResponse,
)
from app.services.dashboard_analytics_service import DashboardAnalyticsService
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/layout", response_model=DashboardLayoutResponse)
async def get_dashboard_layout(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Return the user's dashboard layout. Lazy-creates a default layout on first call."""
    return DashboardService(db).get_layout(user_id)


@router.put("/layout", response_model=DashboardLayoutResponse)
async def update_dashboard_layout(
    payload: DashboardLayoutUpdate,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Replace the user's dashboard layout wholesale."""
    return DashboardService(db).replace_layout(user_id, payload)


@router.get("/monthly-trend", response_model=MonthlyTrendResponse)
async def get_monthly_trend(
    months: int = Query(default=12, ge=1, le=24),
    currency: str | None = Query(default=None, pattern="^[A-Z]{3}$"),
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    return DashboardAnalyticsService(db).get_monthly_trend(
        user_id, months=months, currency=currency
    )


@router.get("/weekday-heatmap", response_model=WeekdayHeatmapResponse)
async def get_weekday_heatmap(
    weeks: int = Query(default=8, ge=1, le=26),
    currency: str | None = Query(default=None, pattern="^[A-Z]{3}$"),
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    return DashboardAnalyticsService(db).get_weekday_heatmap(
        user_id, weeks=weeks, currency=currency
    )


@router.get("/account-trend", response_model=AccountTrendResponse)
async def get_account_trend(
    days: int = Query(default=90, ge=7, le=365),
    currency: str | None = Query(default=None, pattern="^[A-Z]{3}$"),
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    return DashboardAnalyticsService(db).get_account_trend(user_id, days=days, currency=currency)


@router.get("/recurring", response_model=RecurringResponse)
async def get_recurring(
    lookback_days: int = Query(default=120, ge=30, le=365),
    currency: str | None = Query(default=None, pattern="^[A-Z]{3}$"),
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    return DashboardAnalyticsService(db).get_recurring(
        user_id, lookback_days=lookback_days, currency=currency
    )
