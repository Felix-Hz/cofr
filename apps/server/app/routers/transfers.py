from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.auth.dependencies import get_user_id
from app.database import get_db
from app.db.models import Account, Transaction
from app.db.schemas import (
    ExpenseDeleteResponse,
    TransferCreateRequest,
    TransferResponse,
)
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/transfers", tags=["Transfers"])


@router.post("/", response_model=TransferResponse, status_code=201)
async def create_transfer(
    data: TransferCreateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Create a transfer between two accounts"""
    # Validate accounts exist and belong to user
    from_account = (
        db.query(Account)
        .filter(Account.id == data.from_account_id, Account.user_id == user_id)
        .first()
    )
    if not from_account:
        raise HTTPException(status_code=404, detail="Source account not found")

    to_account = (
        db.query(Account)
        .filter(Account.id == data.to_account_id, Account.user_id == user_id)
        .first()
    )
    if not to_account:
        raise HTTPException(status_code=404, detail="Destination account not found")

    if data.from_account_id == data.to_account_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same account")

    created_at = data.created_at or datetime.now(UTC)

    # Create 'from' transaction
    from_tx = Transaction(
        user_id=user_id,
        amount=data.amount,
        currency=data.currency,
        notes=data.description,
        timestamp=created_at,
        account_id=data.from_account_id,
        is_transfer=True,
        transfer_direction="from",
        category_id=None,
    )
    db.add(from_tx)
    db.flush()

    # Create 'to' transaction
    to_tx = Transaction(
        user_id=user_id,
        amount=data.amount,
        currency=data.currency,
        notes=data.description,
        timestamp=created_at,
        account_id=data.to_account_id,
        is_transfer=True,
        transfer_direction="to",
        linked_transaction_id=from_tx.id,
        category_id=None,
    )
    db.add(to_tx)
    db.flush()

    # Link from -> to
    from_tx.linked_transaction_id = to_tx.id
    db.commit()
    db.refresh(from_tx)
    db.refresh(to_tx)

    # Eagerly load relationships for schema conversion
    from_tx = (
        db.query(Transaction)
        .options(joinedload(Transaction.category_rel), joinedload(Transaction.account_rel))
        .filter(Transaction.id == from_tx.id)
        .first()
    )
    to_tx = (
        db.query(Transaction)
        .options(joinedload(Transaction.category_rel), joinedload(Transaction.account_rel))
        .filter(Transaction.id == to_tx.id)
        .first()
    )

    return TransferResponse(
        from_transaction=ExpenseService._to_schema(from_tx),
        to_transaction=ExpenseService._to_schema(to_tx),
    )


@router.put("/{transaction_id}", response_model=TransferResponse)
async def update_transfer(
    transaction_id: str,
    data: TransferCreateRequest,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Update both sides of a transfer atomically"""
    tx = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id,
            Transaction.is_transfer == True,  # noqa: E712
        )
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transfer not found")

    linked = db.query(Transaction).filter(Transaction.id == tx.linked_transaction_id).first()
    if not linked:
        raise HTTPException(status_code=404, detail="Linked transfer not found")

    # Determine which is from and which is to
    from_tx = tx if tx.transfer_direction == "from" else linked
    to_tx = linked if tx.transfer_direction == "from" else tx

    # Validate new accounts
    if data.from_account_id == data.to_account_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to the same account")

    from_account = (
        db.query(Account)
        .filter(Account.id == data.from_account_id, Account.user_id == user_id)
        .first()
    )
    if not from_account:
        raise HTTPException(status_code=404, detail="Source account not found")

    to_account = (
        db.query(Account)
        .filter(Account.id == data.to_account_id, Account.user_id == user_id)
        .first()
    )
    if not to_account:
        raise HTTPException(status_code=404, detail="Destination account not found")

    created_at = data.created_at or from_tx.timestamp

    # Update both sides
    from_tx.amount = data.amount
    from_tx.currency = data.currency
    from_tx.notes = data.description
    from_tx.timestamp = created_at
    from_tx.account_id = data.from_account_id

    to_tx.amount = data.amount
    to_tx.currency = data.currency
    to_tx.notes = data.description
    to_tx.timestamp = created_at
    to_tx.account_id = data.to_account_id

    db.commit()

    # Reload with relationships
    from_tx = (
        db.query(Transaction)
        .options(joinedload(Transaction.category_rel), joinedload(Transaction.account_rel))
        .filter(Transaction.id == from_tx.id)
        .first()
    )
    to_tx = (
        db.query(Transaction)
        .options(joinedload(Transaction.category_rel), joinedload(Transaction.account_rel))
        .filter(Transaction.id == to_tx.id)
        .first()
    )

    return TransferResponse(
        from_transaction=ExpenseService._to_schema(from_tx),
        to_transaction=ExpenseService._to_schema(to_tx),
    )


@router.delete("/{transaction_id}", response_model=ExpenseDeleteResponse)
async def delete_transfer(
    transaction_id: str,
    user_id: str = Depends(get_user_id),
    db: Session = Depends(get_db),
):
    """Delete both sides of a transfer"""
    service = ExpenseService(db)
    await service.delete_expense(user_id, transaction_id)
    return ExpenseDeleteResponse(success=True, message="Transfer deleted successfully")
