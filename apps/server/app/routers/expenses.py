from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import get_telegram_id
from app.database import get_db
from app.db.schemas import ExpensesResponse, MonthlyStats
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("/", response_model=ExpensesResponse)
async def get_expenses(
    telegram_id: str = Depends(get_telegram_id),
    db=Depends(get_db),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """Get paginated expenses for authenticated user"""
    service = ExpenseService(db)
    expenses, total = await service.get_expenses(telegram_id, limit, offset)
    return ExpensesResponse(expenses=expenses, total_count=total, limit=limit, offset=offset)


@router.get("/category/{category}", response_model=ExpensesResponse)
async def get_expenses_by_category(
    category: str,
    telegram_id: str = Depends(get_telegram_id),
    db=Depends(get_db),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """Get paginated expenses filtered by category"""
    service = ExpenseService(db)
    expenses, total = await service.get_expenses_by_category(telegram_id, category, limit, offset)
    return ExpensesResponse(expenses=expenses, total_count=total, limit=limit, offset=offset)


@router.get("/date-range", response_model=ExpensesResponse)
async def get_expenses_by_date_range(
    start_date: datetime,
    end_date: datetime,
    telegram_id: str = Depends(get_telegram_id),
    db=Depends(get_db),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """Get paginated expenses within date range"""
    service = ExpenseService(db)
    expenses, total = await service.get_expenses_by_date_range(
        telegram_id, start_date, end_date, limit, offset
    )
    return ExpensesResponse(expenses=expenses, total_count=total, limit=limit, offset=offset)


@router.get("/stats/monthly", response_model=MonthlyStats)
async def get_monthly_stats(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    telegram_id: str = Depends(get_telegram_id),
    db=Depends(get_db),
):
    """Get monthly statistics with category breakdown"""
    service = ExpenseService(db)
    return await service.get_monthly_stats(telegram_id, month, year)
