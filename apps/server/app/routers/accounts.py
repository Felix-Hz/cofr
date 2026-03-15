from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_user_id
from app.database import get_db
from app.db.models import Account, Transaction, User
from app.db.schemas import (
    AccountBalance,
    AccountCreateRequest,
    AccountSchema,
    AccountUpdateRequest,
)
from app.services.account_service import ensure_system_accounts
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/accounts", tags=["Accounts"])


def _to_schema(account: Account) -> AccountSchema:
    return AccountSchema(
        id=str(account.id),
        name=account.name,
        type=account.type,
        is_system=account.is_system,
        display_order=account.display_order,
    )


@router.get("/", response_model=list[AccountSchema])
async def get_accounts(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """List user's accounts (system + custom)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    accounts = ensure_system_accounts(db, user)
    db.commit()
    return [_to_schema(a) for a in accounts]


@router.post("/", response_model=AccountSchema, status_code=201)
async def create_account(
    data: AccountCreateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Create a custom account"""
    # Check name uniqueness
    existing = (
        db.query(Account).filter(Account.user_id == user_id, Account.name == data.name).first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="An account with this name already exists")

    max_order = (
        db.query(func.max(Account.display_order)).filter(Account.user_id == user_id).scalar()
    ) or 0

    account = Account(
        user_id=user_id,
        name=data.name,
        type=data.type,
        is_system=False,
        display_order=max_order + 1,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return _to_schema(account)


@router.put("/{account_id}", response_model=AccountSchema)
async def update_account(
    account_id: str,
    data: AccountUpdateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Update an account name"""
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if data.name is not None:
        # Check name uniqueness
        existing = (
            db.query(Account)
            .filter(Account.user_id == user_id, Account.name == data.name, Account.id != account_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="An account with this name already exists")
        account.name = data.name

    db.commit()
    db.refresh(account)
    return _to_schema(account)


@router.delete("/{account_id}")
async def delete_account(
    account_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Delete a custom account (reject if has transactions)"""
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if account.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system accounts")

    # Check for transactions
    tx_count = (
        db.query(func.count(Transaction.id)).filter(Transaction.account_id == account_id).scalar()
    )
    if tx_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete account with transactions. Move or delete them first.",
        )

    db.delete(account)
    db.commit()
    return {"success": True, "message": "Account deleted"}


@router.get("/balances", response_model=list[AccountBalance])
async def get_account_balances(
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
    currency: str | None = Query(default=None, pattern="^[A-Z]{3}$"),
):
    """Get all account balances"""
    service = ExpenseService(db)
    return service.get_account_balances(user_id)
