from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.db.models import Transaction
from app.db.schemas import (
    CategoryTotal,
    ExpenseCreateRequest,
    ExpenseSchema,
    ExpenseUpdateRequest,
    MonthlyStats,
)


class ExpenseService:
    def __init__(self, db: Session):
        self.db = db

    async def get_expenses(
        self, user_id: str, limit: int = 50, offset: int = 0
    ) -> tuple[list[ExpenseSchema], int]:
        """Get paginated expenses for a user"""
        total = (
            self.db.query(func.count(Transaction.id))
            .filter(Transaction.user_id == user_id)
            .scalar()
        )

        transactions = (
            self.db.query(Transaction)
            .filter(Transaction.user_id == user_id)
            .order_by(Transaction.timestamp.desc(), Transaction.inserted_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        expenses = [self._to_schema(t) for t in transactions]
        return expenses, total

    async def get_expenses_by_category(
        self, user_id: str, category: str, limit: int = 50, offset: int = 0
    ) -> tuple[list[ExpenseSchema], int]:
        """Get paginated expenses filtered by category"""
        total = (
            self.db.query(func.count(Transaction.id))
            .filter(Transaction.user_id == user_id, Transaction.category == category)
            .scalar()
        )

        transactions = (
            self.db.query(Transaction)
            .filter(Transaction.user_id == user_id, Transaction.category == category)
            .order_by(Transaction.timestamp.desc(), Transaction.inserted_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        expenses = [self._to_schema(t) for t in transactions]
        return expenses, total

    async def get_expenses_by_date_range(
        self,
        user_id: str,
        start_date: datetime,
        end_date: datetime,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[ExpenseSchema], int]:
        """Get paginated expenses within a date range"""
        base_filter = [
            Transaction.user_id == user_id,
            Transaction.timestamp >= start_date,
            Transaction.timestamp <= end_date,
        ]

        total = (
            self.db.query(func.count(Transaction.id))
            .filter(*base_filter)
            .scalar()
        )

        transactions = (
            self.db.query(Transaction)
            .filter(*base_filter)
            .order_by(Transaction.timestamp.desc(), Transaction.inserted_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        expenses = [self._to_schema(t) for t in transactions]
        return expenses, total

    async def get_monthly_stats(
        self, user_id: str, month: int, year: int, currency: str | None = None
    ) -> MonthlyStats:
        """Get monthly statistics with category breakdown, optionally filtered by currency"""
        base_filter = [
            Transaction.user_id == user_id,
            func.extract("month", Transaction.timestamp) == month,
            func.extract("year", Transaction.timestamp) == year,
        ]

        if currency:
            base_filter.append(Transaction.currency == currency)

        excluded_cats = ("Income", "Savings", "Investment")

        summary = self.db.query(
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.category.not_in(excluded_cats), Transaction.amount),
                        else_=0,
                    )
                ),
                0,
            ).label("total_spent"),
            func.coalesce(
                func.sum(
                    case((Transaction.category == "Income", Transaction.amount), else_=0)
                ),
                0,
            ).label("total_income"),
            func.coalesce(
                func.sum(
                    case((Transaction.category == "Savings", Transaction.amount), else_=0)
                ),
                0,
            ).label("total_savings"),
            func.coalesce(
                func.sum(
                    case((Transaction.category == "Investment", Transaction.amount), else_=0)
                ),
                0,
            ).label("total_investment"),
            func.count(
                case((Transaction.category.not_in(excluded_cats), 1))
            ).label("expense_count"),
            func.count(Transaction.id).label("transaction_count"),
        ).filter(*base_filter).first()

        breakdown = (
            self.db.query(
                Transaction.category,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count"),
            )
            .filter(*base_filter)
            .group_by(Transaction.category)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )

        category_breakdown = [
            CategoryTotal(category=row.category, total=row.total, count=row.count)
            for row in breakdown
        ]

        return MonthlyStats(
            total_spent=summary.total_spent if summary else 0,
            total_income=summary.total_income if summary else 0,
            total_savings=summary.total_savings if summary else 0,
            total_investment=summary.total_investment if summary else 0,
            transaction_count=summary.transaction_count if summary else 0,
            expense_count=summary.expense_count if summary else 0,
            category_breakdown=category_breakdown,
            currency=currency or "NZD",
        )

    async def get_expense_by_id(self, user_id: str, expense_id: str) -> ExpenseSchema:
        """Get single expense with ownership check"""
        transaction = (
            self.db.query(Transaction)
            .filter(Transaction.id == expense_id, Transaction.user_id == user_id)
            .first()
        )
        if not transaction:
            raise HTTPException(status_code=404, detail="Expense not found")

        return self._to_schema(transaction)

    async def create_expense(self, user_id: str, data: ExpenseCreateRequest) -> ExpenseSchema:
        """Create a new expense"""
        created_at = data.created_at or datetime.now(timezone.utc)

        transaction = Transaction(
            user_id=user_id,
            amount=data.amount,
            category=data.category,
            notes=data.description,
            timestamp=created_at,
            currency=data.currency,
        )
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)

        return self._to_schema(transaction)

    async def update_expense(
        self, user_id: str, expense_id: str, data: ExpenseUpdateRequest
    ) -> ExpenseSchema:
        """Update an existing expense (partial updates)"""
        transaction = (
            self.db.query(Transaction)
            .filter(Transaction.id == expense_id, Transaction.user_id == user_id)
            .first()
        )
        if not transaction:
            raise HTTPException(status_code=404, detail="Expense not found")

        if data.amount is not None:
            transaction.amount = data.amount
        if data.category is not None:
            transaction.category = data.category
        if data.description is not None:
            transaction.notes = data.description
        if data.currency is not None:
            transaction.currency = data.currency
        if data.created_at is not None:
            transaction.timestamp = data.created_at

        self.db.commit()
        self.db.refresh(transaction)

        return self._to_schema(transaction)

    async def delete_expense(self, user_id: str, expense_id: str) -> bool:
        """Delete an expense with ownership verification"""
        transaction = (
            self.db.query(Transaction)
            .filter(Transaction.id == expense_id, Transaction.user_id == user_id)
            .first()
        )
        if not transaction:
            raise HTTPException(status_code=404, detail="Expense not found")

        self.db.delete(transaction)
        self.db.commit()
        return True

    @staticmethod
    def _to_schema(transaction: Transaction) -> ExpenseSchema:
        """Convert a Transaction ORM object to ExpenseSchema"""
        return ExpenseSchema(
            id=str(transaction.id),
            amount=transaction.amount,
            category=transaction.category,
            description=transaction.notes or "",
            created_at=transaction.timestamp,
            currency=transaction.currency,
        )
