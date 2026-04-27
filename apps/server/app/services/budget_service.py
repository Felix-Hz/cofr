from datetime import UTC, date, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import case, func
from sqlalchemy import false as sa_false
from sqlalchemy.orm import Session, selectinload

from app.db.models import Budget, BudgetCategory, Category, ExchangeRate, Transaction, User
from app.db.schemas import (
    BudgetCreateRequest,
    BudgetHistoryPeriod,
    BudgetHistoryResponse,
    BudgetSchema,
    BudgetUpdateRequest,
)


def _current_period(period_type: str, tz: str | None) -> tuple[date, date]:
    """Compute current period start/end in user's local date."""
    try:
        from zoneinfo import ZoneInfo

        zone = ZoneInfo(tz) if tz else UTC
    except Exception:
        zone = UTC

    today = datetime.now(zone).date()

    if period_type == "monthly":
        start = today.replace(day=1)
        # Last day of this month
        if today.month == 12:
            end = today.replace(month=12, day=31)
        else:
            end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        return start, end

    if period_type == "weekly":
        # Monday-based week
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        return start, end

    # Fallback (shouldn't reach here for custom — callers pass explicit dates)
    return today, today


def _period_start_for_offset(period_type: str, tz: str | None, offset: int) -> tuple[date, date]:
    """Compute period start/end going back `offset` periods from the current one."""
    try:
        from zoneinfo import ZoneInfo

        zone = ZoneInfo(tz) if tz else UTC
    except Exception:
        zone = UTC

    today = datetime.now(zone).date()

    if period_type == "monthly":
        # Walk back `offset` months
        month = today.month - offset
        year = today.year
        while month <= 0:
            month += 12
            year -= 1
        start = date(year, month, 1)
        if month == 12:
            end = date(year, 12, 31)
        else:
            end = date(year, month + 1, 1) - timedelta(days=1)
        return start, end

    if period_type == "weekly":
        start_of_this_week = today - timedelta(days=today.weekday())
        start = start_of_this_week - timedelta(weeks=offset)
        end = start + timedelta(days=6)
        return start, end

    return today, today


def _period_label(period_type: str, start: date) -> str:
    if period_type == "monthly":
        return start.strftime("%b %Y")
    if period_type == "weekly":
        return f"Week of {start.strftime('%d %b')}"
    return start.strftime("%d %b %Y")


def _compute_spent(
    db: Session,
    user_id: str,
    category_ids: list[str],
    budget_type: str,
    budget_currency: str,
    period_start: date,
    period_end: date,
) -> float:
    """Sum transactions for the given categories, converted to budget_currency."""
    if not category_ids:
        return 0.0

    start_dt = datetime(period_start.year, period_start.month, period_start.day, tzinfo=UTC)
    end_dt = datetime(period_end.year, period_end.month, period_end.day, 23, 59, 59, tzinfo=UTC)

    target_rate = (
        db.query(ExchangeRate.rate_to_usd)
        .filter(ExchangeRate.currency_code == budget_currency)
        .scalar_subquery()
    )

    converted = case(
        (
            ExchangeRate.rate_to_usd.isnot(None),
            Transaction.amount / ExchangeRate.rate_to_usd * target_rate,
        ),
        else_=Transaction.amount,
    )

    result = (
        db.query(func.coalesce(func.sum(converted), 0))
        .join(Category, Transaction.category_id == Category.id)
        .outerjoin(ExchangeRate, ExchangeRate.currency_code == Transaction.currency)
        .filter(
            Transaction.user_id == user_id,
            Transaction.category_id.in_(category_ids),
            Category.type == budget_type,
            Transaction.timestamp >= start_dt,
            Transaction.timestamp <= end_dt,
            Transaction.is_opening_balance == sa_false(),
            Transaction.is_transfer == sa_false(),
        )
        .scalar()
    )
    return float(result or 0)


def _budget_to_schema(
    budget: Budget,
    category_ids: list[str],
    spent: float,
    period_start: date,
    period_end: date,
) -> BudgetSchema:
    return BudgetSchema(
        id=str(budget.id),
        name=budget.name,
        period_type=budget.period_type,
        amount=budget.amount,
        currency=budget.currency,
        budget_type=budget.budget_type,
        start_date=budget.start_date,
        end_date=budget.end_date,
        is_active=budget.is_active,
        category_ids=category_ids,
        spent=spent,
        remaining=budget.amount - spent,
        period_start=period_start,
        period_end=period_end,
    )


class BudgetService:
    def __init__(self, db: Session):
        self.db = db

    def _user_timezone(self, user_id: str) -> str | None:
        user = self.db.query(User.timezone).filter(User.id == user_id).first()
        return user.timezone if user else None

    def _load_budget(self, user_id: str, budget_id: str) -> Budget:
        budget = (
            self.db.query(Budget)
            .options(selectinload(Budget.categories))
            .filter(Budget.id == budget_id, Budget.user_id == user_id)
            .first()
        )
        if not budget:
            raise HTTPException(status_code=404, detail="Budget not found")
        return budget

    async def get_budgets(self, user_id: str) -> list[BudgetSchema]:
        tz = self._user_timezone(user_id)
        budgets = (
            self.db.query(Budget)
            .options(selectinload(Budget.categories))
            .filter(Budget.user_id == user_id)
            .order_by(Budget.created_at)
            .all()
        )

        result = []
        for b in budgets:
            if b.period_type == "custom":
                period_start = b.start_date or date.today()
                period_end = b.end_date or date.today()
            else:
                period_start, period_end = _current_period(b.period_type, tz)

            cat_ids = [str(bc.category_id) for bc in b.categories]
            spent = _compute_spent(
                self.db, user_id, cat_ids, b.budget_type, b.currency, period_start, period_end
            )
            result.append(_budget_to_schema(b, cat_ids, spent, period_start, period_end))

        return result

    async def create_budget(self, user_id: str, data: BudgetCreateRequest) -> BudgetSchema:
        if data.period_type == "custom":
            if not data.start_date or not data.end_date:
                raise HTTPException(
                    status_code=400,
                    detail="start_date and end_date are required for custom budgets",
                )
            if data.start_date > data.end_date:
                raise HTTPException(status_code=400, detail="start_date must be before end_date")

        budget = Budget(
            user_id=user_id,
            name=data.name,
            period_type=data.period_type,
            amount=data.amount,
            currency=data.currency,
            budget_type=data.budget_type,
            start_date=data.start_date,
            end_date=data.end_date,
        )
        self.db.add(budget)
        self.db.flush()

        for cid in data.category_ids:
            self.db.add(BudgetCategory(budget_id=budget.id, category_id=cid))

        self.db.commit()
        self.db.refresh(budget)

        tz = self._user_timezone(user_id)
        if budget.period_type == "custom":
            period_start = budget.start_date or date.today()
            period_end = budget.end_date or date.today()
        else:
            period_start, period_end = _current_period(budget.period_type, tz)

        spent = _compute_spent(
            self.db,
            user_id,
            data.category_ids,
            budget.budget_type,
            budget.currency,
            period_start,
            period_end,
        )
        return _budget_to_schema(budget, data.category_ids, spent, period_start, period_end)

    async def update_budget(
        self, user_id: str, budget_id: str, data: BudgetUpdateRequest
    ) -> BudgetSchema:
        budget = self._load_budget(user_id, budget_id)

        if data.name is not None:
            budget.name = data.name
        if data.period_type is not None:
            budget.period_type = data.period_type
        if data.amount is not None:
            budget.amount = data.amount
        if data.currency is not None:
            budget.currency = data.currency
        if data.budget_type is not None:
            budget.budget_type = data.budget_type
        if data.start_date is not None:
            budget.start_date = data.start_date
        if data.end_date is not None:
            budget.end_date = data.end_date
        if data.is_active is not None:
            budget.is_active = data.is_active

        if data.category_ids is not None:
            self.db.query(BudgetCategory).filter(BudgetCategory.budget_id == budget.id).delete()
            for cid in data.category_ids:
                self.db.add(BudgetCategory(budget_id=budget.id, category_id=cid))

        if budget.period_type == "custom" and (not budget.start_date or not budget.end_date):
            raise HTTPException(
                status_code=400,
                detail="start_date and end_date are required for custom budgets",
            )

        budget.updated_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(budget)

        tz = self._user_timezone(user_id)
        if budget.period_type == "custom":
            period_start = budget.start_date or date.today()
            period_end = budget.end_date or date.today()
        else:
            period_start, period_end = _current_period(budget.period_type, tz)

        cat_ids = (
            data.category_ids
            if data.category_ids is not None
            else [str(bc.category_id) for bc in budget.categories]
        )
        spent = _compute_spent(
            self.db,
            user_id,
            cat_ids,
            budget.budget_type,
            budget.currency,
            period_start,
            period_end,
        )
        return _budget_to_schema(budget, cat_ids, spent, period_start, period_end)

    async def delete_budget(self, user_id: str, budget_id: str) -> None:
        budget = (
            self.db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == user_id).first()
        )
        if not budget:
            raise HTTPException(status_code=404, detail="Budget not found")
        self.db.delete(budget)
        self.db.commit()

    async def get_history(
        self, user_id: str, budget_id: str, periods: int = 6
    ) -> BudgetHistoryResponse:
        budget = self._load_budget(user_id, budget_id)
        cat_ids = [str(bc.category_id) for bc in budget.categories]
        tz = self._user_timezone(user_id)

        if budget.period_type == "custom":
            period_start = budget.start_date or date.today()
            period_end = budget.end_date or date.today()
            spent = _compute_spent(
                self.db,
                user_id,
                cat_ids,
                budget.budget_type,
                budget.currency,
                period_start,
                period_end,
            )
            return BudgetHistoryResponse(
                budget_id=str(budget.id),
                budget_name=budget.name,
                currency=budget.currency,
                budget_type=budget.budget_type,
                periods=[
                    BudgetHistoryPeriod(
                        period_label=_period_label(budget.period_type, period_start),
                        period_start=period_start,
                        period_end=period_end,
                        budgeted=budget.amount,
                        spent=spent,
                    )
                ],
            )

        history: list[BudgetHistoryPeriod] = []
        for i in range(periods - 1, -1, -1):
            p_start, p_end = _period_start_for_offset(budget.period_type, tz, i)
            spent = _compute_spent(
                self.db,
                user_id,
                cat_ids,
                budget.budget_type,
                budget.currency,
                p_start,
                p_end,
            )
            history.append(
                BudgetHistoryPeriod(
                    period_label=_period_label(budget.period_type, p_start),
                    period_start=p_start,
                    period_end=p_end,
                    budgeted=budget.amount,
                    spent=spent,
                )
            )

        return BudgetHistoryResponse(
            budget_id=str(budget.id),
            budget_name=budget.name,
            currency=budget.currency,
            budget_type=budget.budget_type,
            periods=history,
        )
