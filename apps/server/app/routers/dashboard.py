from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.database import get_db
from app.db.schemas import (
    AccountTrendResponse,
    DashboardBootstrapResponse,
    DashboardLayoutResponse,
    DashboardLayoutUpdate,
    ExpensesResponse,
    LifetimeStats,
    MonthlyStats,
    MonthlyTrendResponse,
    RecurringResponse,
    SparklineResponse,
    WeekdayHeatmapResponse,
)
from app.services.dashboard_analytics_service import DashboardAnalyticsService
from app.services.dashboard_service import DashboardService
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

PERIOD_STATS_WIDGET_TYPES = frozenset(
    {
        "period_stats_4up",
        "stat_income",
        "stat_spent",
        "stat_net",
        "stat_savings_rate",
        "category_pie",
        "top_categories_bars",
        "avg_daily_spend",
        "income_spend_compare",
    }
)


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


@router.get("/bootstrap", response_model=DashboardBootstrapResponse)
async def get_dashboard_bootstrap(
    start_date: str = Query(...),
    end_date: str = Query(...),
    currency: str | None = Query(default=None, pattern="^[A-Z]{3}$"),
    limit: int = Query(default=10, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    category: str | None = Query(default=None),
    min_amount: float | None = Query(default=None, ge=0),
    max_amount: float | None = Query(default=None, ge=0),
    months: int = Query(default=12, ge=1, le=24),
    weeks: int = Query(default=8, ge=1, le=26),
    days: int = Query(default=90, ge=7, le=365),
    lookback_days: int = Query(default=120, ge=30, le=365),
    widget_type: list[str] = Query(default=[]),
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    expense_service = ExpenseService(db)
    analytics_service = DashboardAnalyticsService(db)
    preferred_currency = expense_service.get_preferred_currency(user_id)
    display_currency = currency or preferred_currency
    requested_widgets = set(widget_type)

    wants_period_stats = bool(requested_widgets & PERIOD_STATS_WIDGET_TYPES)
    wants_transactions = "transactions" in requested_widgets
    wants_lifetime_stats = bool(requested_widgets & {"net_worth", "savings_investment"})
    wants_account_balances = "account_balances" in requested_widgets
    wants_sparkline = "spend_sparkline" in requested_widgets
    wants_monthly_trend = "monthly_trend_bars" in requested_widgets
    wants_weekday_heatmap = "weekday_heatmap" in requested_widgets
    wants_account_trend = "account_trend" in requested_widgets
    wants_recurring = "recurring_subscriptions" in requested_widgets

    parsed_start_date = datetime.fromisoformat(start_date)
    parsed_end_date = datetime.fromisoformat(end_date)

    account_balances = []
    if wants_period_stats or wants_lifetime_stats or wants_account_balances:
        account_balances = expense_service.get_account_balances(user_id)

    expenses = ExpensesResponse(expenses=[], total_count=0, limit=limit, offset=offset)
    if wants_transactions:
        expense_rows, total = await expense_service.get_expenses(
            user_id,
            limit=limit,
            offset=offset,
            start_date=parsed_start_date,
            end_date=parsed_end_date,
            category=category,
            min_amount=min_amount,
            max_amount=max_amount,
            collapse_transfer_pairs=True,
        )
        expenses = ExpensesResponse(
            expenses=expense_rows,
            total_count=total,
            limit=limit,
            offset=offset,
        )

    period_stats = MonthlyStats(
        total_spent=0.0,
        total_income=0.0,
        transaction_count=0,
        expense_count=0,
        category_breakdown=[],
        currency=display_currency,
        is_converted=currency is None,
        account_balances=account_balances,
        savings_net_change=0.0,
    )
    if wants_period_stats:
        period_stats = await expense_service.get_range_stats(
            user_id,
            parsed_start_date,
            parsed_end_date,
            currency,
            account_balances=account_balances,
        )

    lifetime_stats = LifetimeStats(
        net_worth=0.0,
        savings_balance=0.0,
        investment_balance=0.0,
        checking_balance=0.0,
        lifetime_income=0.0,
        lifetime_spent=0.0,
        currency=display_currency,
        is_converted=currency is None,
    )
    if wants_lifetime_stats:
        lifetime_stats = expense_service.get_lifetime_stats(
            user_id,
            currency,
            account_balances=account_balances,
        )

    sparkline = SparklineResponse(
        points=[],
        currency=display_currency,
        is_converted=currency is None,
    )
    if wants_sparkline:
        sparkline = expense_service.get_spend_sparkline(
            user_id, parsed_start_date, parsed_end_date, currency
        )

    monthly_trend = MonthlyTrendResponse(
        points=[],
        currency=display_currency,
        is_converted=currency is None,
    )
    if wants_monthly_trend:
        monthly_trend = analytics_service.get_monthly_trend(
            user_id, months=months, currency=currency
        )

    weekday_heatmap = WeekdayHeatmapResponse(
        cells=[],
        weeks=weeks,
        currency=display_currency,
        is_converted=currency is None,
    )
    if wants_weekday_heatmap:
        weekday_heatmap = analytics_service.get_weekday_heatmap(
            user_id, weeks=weeks, currency=currency
        )

    account_trend = AccountTrendResponse(
        series=[],
        days=days,
        currency=display_currency,
        is_converted=currency is None,
    )
    if wants_account_trend:
        account_trend = analytics_service.get_account_trend(user_id, days=days, currency=currency)

    recurring = RecurringResponse(
        charges=[],
        currency=display_currency,
        is_converted=currency is None,
    )
    if wants_recurring:
        recurring = analytics_service.get_recurring(
            user_id,
            lookback_days=lookback_days,
            currency=currency,
        )

    return DashboardBootstrapResponse(
        preferred_currency=preferred_currency,
        expenses=expenses,
        period_stats=period_stats,
        lifetime_stats=lifetime_stats,
        account_balances=account_balances,
        sparkline=sparkline,
        monthly_trend=monthly_trend,
        weekday_heatmap=weekday_heatmap,
        account_trend=account_trend,
        recurring=recurring,
    )


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
