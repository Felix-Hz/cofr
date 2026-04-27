from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.database import get_db
from app.db.schemas import (
    BudgetCreateRequest,
    BudgetHistoryResponse,
    BudgetSchema,
    BudgetUpdateRequest,
)
from app.services.budget_service import BudgetService

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.get("", response_model=list[BudgetSchema])
async def list_budgets(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    return await BudgetService(db).get_budgets(user_id)


@router.post("", response_model=BudgetSchema, status_code=201)
async def create_budget(
    data: BudgetCreateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    return await BudgetService(db).create_budget(user_id, data)


@router.put("/{budget_id}", response_model=BudgetSchema)
async def update_budget(
    budget_id: str,
    data: BudgetUpdateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    return await BudgetService(db).update_budget(user_id, budget_id, data)


@router.delete("/{budget_id}", status_code=204)
async def delete_budget(
    budget_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    await BudgetService(db).delete_budget(user_id, budget_id)


@router.get("/{budget_id}/history", response_model=BudgetHistoryResponse)
async def get_budget_history(
    budget_id: str,
    periods: int = Query(default=6, ge=1, le=24),
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    return await BudgetService(db).get_history(user_id, budget_id, periods)
