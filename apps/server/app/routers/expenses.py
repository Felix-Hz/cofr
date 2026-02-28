from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.database import get_db
from app.db.schemas import (
    ExpenseCreateRequest,
    ExpenseDeleteResponse,
    ExpenseSchema,
    ExpensesResponse,
    ExpenseUpdateRequest,
    MonthlyStats,
)
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("/", response_model=ExpensesResponse)
async def get_expenses(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """Get paginated expenses for authenticated user"""
    service = ExpenseService(db)
    expenses, total = await service.get_expenses(user_id, limit, offset)
    return ExpensesResponse(expenses=expenses, total_count=total, limit=limit, offset=offset)


@router.get("/category/{category}", response_model=ExpensesResponse)
async def get_expenses_by_category(
    category: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """Get paginated expenses filtered by category"""
    service = ExpenseService(db)
    expenses, total = await service.get_expenses_by_category(user_id, category, limit, offset)
    return ExpensesResponse(expenses=expenses, total_count=total, limit=limit, offset=offset)


@router.get("/date-range", response_model=ExpensesResponse)
async def get_expenses_by_date_range(
    start_date: datetime,
    end_date: datetime,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """Get paginated expenses within date range"""
    service = ExpenseService(db)
    expenses, total = await service.get_expenses_by_date_range(
        user_id, start_date, end_date, limit, offset
    )
    return ExpensesResponse(expenses=expenses, total_count=total, limit=limit, offset=offset)


@router.get("/stats/monthly", response_model=MonthlyStats)
async def get_monthly_stats(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    currency: str | None = Query(default=None, pattern="^[A-Z]{3}$"),
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Get monthly statistics with category breakdown, optionally filtered by currency"""
    service = ExpenseService(db)
    return await service.get_monthly_stats(user_id, month, year, currency)


@router.post("/", response_model=ExpenseSchema, status_code=201)
async def create_expense(
    data: ExpenseCreateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Create a new expense"""
    service = ExpenseService(db)
    return await service.create_expense(user_id, data)


@router.get("/{expense_id}", response_model=ExpenseSchema)
async def get_expense(
    expense_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Get a single expense by ID"""
    service = ExpenseService(db)
    return await service.get_expense_by_id(user_id, expense_id)


@router.put("/{expense_id}", response_model=ExpenseSchema)
async def update_expense(
    expense_id: str,
    data: ExpenseUpdateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Update an existing expense"""
    service = ExpenseService(db)
    return await service.update_expense(user_id, expense_id, data)


@router.delete("/{expense_id}", response_model=ExpenseDeleteResponse)
async def delete_expense(
    expense_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Delete an expense"""
    service = ExpenseService(db)
    await service.delete_expense(user_id, expense_id)
    return ExpenseDeleteResponse(success=True, message="Expense deleted successfully")
