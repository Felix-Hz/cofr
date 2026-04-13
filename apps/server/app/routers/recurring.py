from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.database import get_db
from app.db.models import Account, Category, RecurringRule, User
from app.db.schemas import (
    ExpenseSchema,
    ExpensesResponse,
    RecurringRuleCreateRequest,
    RecurringRuleDeleteResponse,
    RecurringRuleSchema,
    RecurringRuleUpdateRequest,
)
from app.services.expense_service import ExpenseService
from app.services.recurring_service import (
    advance,
    get_rule_history,
    list_rules,
    materialize_rule,
    to_schema,
    user_today,
)

router = APIRouter(prefix="/recurring", tags=["Recurring"])


def _validate_and_build(
    db: Session, user_id: str, data: RecurringRuleCreateRequest
) -> RecurringRule:
    account = (
        db.query(Account).filter(Account.id == data.account_id, Account.user_id == user_id).first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if data.type == "transfer":
        if not data.to_account_id:
            raise HTTPException(status_code=400, detail="to_account_id required for transfer rules")
        if data.to_account_id == data.account_id:
            raise HTTPException(status_code=400, detail="Cannot transfer to the same account")
        to_account = (
            db.query(Account)
            .filter(Account.id == data.to_account_id, Account.user_id == user_id)
            .first()
        )
        if not to_account:
            raise HTTPException(status_code=404, detail="Destination account not found")
        if data.category_id is not None:
            raise HTTPException(status_code=400, detail="Transfer rules must not have a category")
    else:
        if not data.category_id:
            raise HTTPException(
                status_code=400,
                detail="category_id required for expense/income rules",
            )
        category = (
            db.query(Category)
            .filter(
                Category.id == data.category_id,
                (Category.user_id == user_id) | (Category.user_id.is_(None)),
            )
            .first()
        )
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        if data.type == "expense" and category.type != "expense":
            raise HTTPException(status_code=400, detail="Category is not an expense category")
        if data.type == "income" and category.type != "income":
            raise HTTPException(status_code=400, detail="Category is not an income category")

    if data.end_date is not None and data.end_date < data.start_date:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")

    return RecurringRule(
        user_id=user_id,
        type=data.type,
        name=data.name,
        amount=data.amount,
        currency=data.currency,
        account_id=data.account_id,
        to_account_id=data.to_account_id if data.type == "transfer" else None,
        category_id=data.category_id if data.type != "transfer" else None,
        merchant=data.merchant,
        description=data.description,
        interval_unit=data.interval_unit,
        interval_count=data.interval_count,
        day_of_month=data.day_of_month,
        day_of_week=data.day_of_week,
        start_date=data.start_date,
        end_date=data.end_date,
        next_due_at=data.start_date,
        is_active=True,
    )


@router.get("/", response_model=list[RecurringRuleSchema])
async def list_recurring_rules(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    return [to_schema(db, rule) for rule in list_rules(db, user_id)]


@router.post("/", response_model=RecurringRuleSchema, status_code=201)
async def create_recurring_rule(
    data: RecurringRuleCreateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    rule = _validate_and_build(db, user_id, data)
    db.add(rule)
    db.commit()
    db.refresh(rule)

    # Materialize immediately if start_date <= today (user-local)
    user = db.query(User).filter(User.id == user_id).first()
    today = user_today(user)
    if rule.next_due_at <= today:
        materialize_rule(db, rule, today=today)
        db.commit()
        db.refresh(rule)

    return to_schema(db, rule)


@router.get("/{rule_id}", response_model=RecurringRuleSchema)
async def get_recurring_rule(
    rule_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    rule = (
        db.query(RecurringRule)
        .filter(RecurringRule.id == rule_id, RecurringRule.user_id == user_id)
        .first()
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Recurring rule not found")
    return to_schema(db, rule)


@router.put("/{rule_id}", response_model=RecurringRuleSchema)
async def update_recurring_rule(
    rule_id: str,
    data: RecurringRuleUpdateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    rule = (
        db.query(RecurringRule)
        .filter(RecurringRule.id == rule_id, RecurringRule.user_id == user_id)
        .first()
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Recurring rule not found")

    # Per product rule: updates affect FUTURE occurrences only. Already-materialized
    # transactions are left intact.
    fields = data.model_fields_set
    cadence_changed = bool(
        fields & {"interval_unit", "interval_count", "start_date", "day_of_month", "day_of_week"}
    )

    if data.name is not None:
        rule.name = data.name
    if data.amount is not None:
        rule.amount = data.amount
    if data.currency is not None:
        rule.currency = data.currency
    if data.account_id is not None:
        account = (
            db.query(Account)
            .filter(Account.id == data.account_id, Account.user_id == user_id)
            .first()
        )
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        rule.account_id = data.account_id
    if data.to_account_id is not None:
        if rule.type != "transfer":
            raise HTTPException(
                status_code=400, detail="to_account_id only valid for transfer rules"
            )
        to_account = (
            db.query(Account)
            .filter(Account.id == data.to_account_id, Account.user_id == user_id)
            .first()
        )
        if not to_account:
            raise HTTPException(status_code=404, detail="Destination account not found")
        if data.to_account_id == rule.account_id:
            raise HTTPException(status_code=400, detail="Cannot transfer to the same account")
        rule.to_account_id = data.to_account_id
    if data.category_id is not None:
        if rule.type == "transfer":
            raise HTTPException(status_code=400, detail="Transfer rules must not have a category")
        category = (
            db.query(Category)
            .filter(
                Category.id == data.category_id,
                (Category.user_id == user_id) | (Category.user_id.is_(None)),
            )
            .first()
        )
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        rule.category_id = data.category_id
    if "merchant" in fields:
        rule.merchant = data.merchant
    if data.description is not None:
        rule.description = data.description
    if data.interval_unit is not None:
        rule.interval_unit = data.interval_unit
    if data.interval_count is not None:
        rule.interval_count = data.interval_count
    if "day_of_month" in fields:
        rule.day_of_month = data.day_of_month
    if "day_of_week" in fields:
        rule.day_of_week = data.day_of_week
    if data.start_date is not None:
        rule.start_date = data.start_date
    if "end_date" in fields:
        rule.end_date = data.end_date
    if data.is_active is not None:
        rule.is_active = data.is_active

    if rule.end_date is not None and rule.end_date < rule.start_date:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")

    # If cadence changed, realign next_due_at: advance past last_materialized_at
    # (or stay at start_date if nothing has fired yet).
    if cadence_changed:
        if rule.last_materialized_at is not None:
            rule.next_due_at = advance(
                rule.start_date,
                rule.interval_unit,
                rule.interval_count,
                rule.last_materialized_at,
            )
        else:
            rule.next_due_at = rule.start_date

    db.commit()
    db.refresh(rule)
    return to_schema(db, rule)


@router.patch("/{rule_id}/pause", response_model=RecurringRuleSchema)
async def pause_recurring_rule(
    rule_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    rule = (
        db.query(RecurringRule)
        .filter(RecurringRule.id == rule_id, RecurringRule.user_id == user_id)
        .first()
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Recurring rule not found")
    rule.is_active = not rule.is_active
    db.commit()
    db.refresh(rule)
    return to_schema(db, rule)


@router.delete("/{rule_id}", response_model=RecurringRuleDeleteResponse)
async def delete_recurring_rule(
    rule_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    rule = (
        db.query(RecurringRule)
        .filter(RecurringRule.id == rule_id, RecurringRule.user_id == user_id)
        .first()
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Recurring rule not found")
    # Materialized transactions are intentionally left intact (FK is SET NULL).
    db.delete(rule)
    db.commit()
    return RecurringRuleDeleteResponse(success=True, message="Recurring rule deleted")


@router.get("/{rule_id}/history", response_model=ExpensesResponse)
async def get_recurring_rule_history(
    rule_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    rule = (
        db.query(RecurringRule)
        .filter(RecurringRule.id == rule_id, RecurringRule.user_id == user_id)
        .first()
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Recurring rule not found")

    rows, total = get_rule_history(db, user_id, rule_id, limit=limit, offset=offset)
    service = ExpenseService(db)
    expenses: list[ExpenseSchema] = [service._to_schema(tx) for tx in rows]
    return ExpensesResponse(expenses=expenses, total_count=total, limit=limit, offset=offset)
