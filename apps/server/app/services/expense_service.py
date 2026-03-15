from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import case, func
from sqlalchemy import false as sa_false
from sqlalchemy.orm import Session, joinedload

from app.db.models import Account, Category, Transaction, User
from app.db.schemas import (
    AccountBalance,
    CategoryTotal,
    ExpenseCreateRequest,
    ExpenseSchema,
    ExpenseUpdateRequest,
    MonthlyStats,
)
from app.services.exchange_rates import convert, get_rates_from_db


class ExpenseService:
    def __init__(self, db: Session):
        self.db = db

    async def get_expenses(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        category: str | None = None,
        min_amount: float | None = None,
        max_amount: float | None = None,
    ) -> tuple[list[ExpenseSchema], int]:
        """Get paginated expenses for a user with optional filters"""
        filters = [Transaction.user_id == user_id]

        if start_date:
            filters.append(Transaction.timestamp >= start_date)
        if end_date:
            filters.append(Transaction.timestamp <= end_date)
        if category:
            filters.append(Transaction.category_id == category)
        if min_amount is not None:
            filters.append(Transaction.amount >= min_amount)
        if max_amount is not None:
            filters.append(Transaction.amount <= max_amount)

        total = self.db.query(func.count(Transaction.id)).filter(*filters).scalar()

        transactions = (
            self.db.query(Transaction)
            .options(joinedload(Transaction.category_rel), joinedload(Transaction.account_rel))
            .filter(*filters)
            .order_by(Transaction.timestamp.desc(), Transaction.inserted_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        expenses = [self._to_schema(t) for t in transactions]
        return expenses, total

    async def get_expenses_by_category(
        self, user_id: str, category_id: str, limit: int = 50, offset: int = 0
    ) -> tuple[list[ExpenseSchema], int]:
        """Get paginated expenses filtered by category"""
        total = (
            self.db.query(func.count(Transaction.id))
            .filter(Transaction.user_id == user_id, Transaction.category_id == category_id)
            .scalar()
        )

        transactions = (
            self.db.query(Transaction)
            .options(joinedload(Transaction.category_rel), joinedload(Transaction.account_rel))
            .filter(Transaction.user_id == user_id, Transaction.category_id == category_id)
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

        total = self.db.query(func.count(Transaction.id)).filter(*base_filter).scalar()

        transactions = (
            self.db.query(Transaction)
            .options(joinedload(Transaction.category_rel), joinedload(Transaction.account_rel))
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
            Transaction.is_opening_balance == sa_false(),
            Transaction.is_transfer == sa_false(),
        ]

        if currency:
            base_filter.append(Transaction.currency == currency)
            stats = self._aggregate_sql(base_filter, currency)
        else:
            stats = self._aggregate_with_conversion(base_filter, user_id)

        stats.account_balances = self.get_account_balances(user_id)
        return stats

    async def get_range_stats(
        self, user_id: str, start_date: datetime, end_date: datetime, currency: str | None = None
    ) -> MonthlyStats:
        """Get statistics for a date range with category breakdown, optionally filtered by currency"""
        base_filter = [
            Transaction.user_id == user_id,
            Transaction.timestamp >= start_date,
            Transaction.timestamp <= end_date,
            Transaction.is_opening_balance == sa_false(),
            Transaction.is_transfer == sa_false(),
        ]

        if currency:
            base_filter.append(Transaction.currency == currency)
            stats = self._aggregate_sql(base_filter, currency)
        else:
            stats = self._aggregate_with_conversion(base_filter, user_id)

        stats.account_balances = self.get_account_balances(user_id)
        return stats

    def _aggregate_sql(self, base_filter: list, currency: str) -> MonthlyStats:
        """Aggregate stats using SQL (single-currency path)."""
        summary = (
            self.db.query(
                func.coalesce(
                    func.sum(
                        case(
                            (Category.type == "expense", Transaction.amount),
                            else_=0,
                        )
                    ),
                    0,
                ).label("total_spent"),
                func.coalesce(
                    func.sum(case((Category.type == "income", Transaction.amount), else_=0)),
                    0,
                ).label("total_income"),
                func.count(case((Category.type == "expense", 1))).label("expense_count"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .join(Category, Transaction.category_id == Category.id)
            .filter(*base_filter)
            .first()
        )

        breakdown = (
            self.db.query(
                Transaction.category_id,
                Category.name.label("category_name"),
                Category.type.label("category_type"),
                Category.color_light,
                Category.color_dark,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count"),
            )
            .join(Category, Transaction.category_id == Category.id)
            .filter(*base_filter)
            .group_by(
                Transaction.category_id,
                Category.name,
                Category.type,
                Category.color_light,
                Category.color_dark,
            )
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )

        category_breakdown = [
            CategoryTotal(
                category_id=str(row.category_id),
                category=row.category_name,
                category_type=row.category_type,
                category_color_light=row.color_light,
                category_color_dark=row.color_dark,
                total=row.total,
                count=row.count,
            )
            for row in breakdown
        ]

        return MonthlyStats(
            total_spent=summary.total_spent if summary else 0,
            total_income=summary.total_income if summary else 0,
            transaction_count=summary.transaction_count if summary else 0,
            expense_count=summary.expense_count if summary else 0,
            category_breakdown=category_breakdown,
            currency=currency,
        )

    def _aggregate_with_conversion(self, base_filter: list, user_id: str) -> MonthlyStats:
        """Fetch all transactions, convert to user's preferred currency and aggregate."""
        rates = get_rates_from_db(self.db)
        user = self.db.query(User).filter(User.id == user_id).first()
        preferred = user.preferred_currency if user else "NZD"

        transactions = (
            self.db.query(Transaction)
            .options(joinedload(Transaction.category_rel))
            .filter(*base_filter)
            .all()
        )

        total_spent = 0.0
        total_income = 0.0
        expense_count = 0
        cat_totals: dict[str, dict] = {}

        for tx in transactions:
            amt = convert(tx.amount, tx.currency, preferred, rates)
            cat = tx.category_rel
            if not cat:
                continue
            cat_key = str(tx.category_id)

            if cat_key not in cat_totals:
                cat_totals[cat_key] = {
                    "name": cat.name,
                    "type": cat.type,
                    "color_light": cat.color_light,
                    "color_dark": cat.color_dark,
                    "total": 0.0,
                    "count": 0,
                }
            cat_totals[cat_key]["total"] += amt
            cat_totals[cat_key]["count"] += 1

            if cat.type == "income":
                total_income += amt
            else:
                total_spent += amt
                expense_count += 1

        category_breakdown = sorted(
            [
                CategoryTotal(
                    category_id=cat_id,
                    category=vals["name"],
                    category_type=vals["type"],
                    category_color_light=vals["color_light"],
                    category_color_dark=vals["color_dark"],
                    total=vals["total"],
                    count=vals["count"],
                )
                for cat_id, vals in cat_totals.items()
            ],
            key=lambda c: c.total,
            reverse=True,
        )

        return MonthlyStats(
            total_spent=total_spent,
            total_income=total_income,
            transaction_count=len(transactions),
            expense_count=expense_count,
            category_breakdown=category_breakdown,
            currency=preferred,
            is_converted=True,
        )

    def get_account_balances(self, user_id: str) -> list[AccountBalance]:
        """Calculate balance for each of the user's accounts."""
        accounts = (
            self.db.query(Account)
            .filter(Account.user_id == user_id)
            .order_by(Account.display_order)
            .all()
        )

        balances = []
        for account in accounts:
            # Sum all transactions for this account with sign:
            # - income type or transfer 'to' = positive
            # - expense type or transfer 'from' = negative
            txs = (
                self.db.query(Transaction)
                .outerjoin(Category, Transaction.category_id == Category.id)
                .filter(Transaction.account_id == account.id)
                .all()
            )

            balance = 0.0
            for tx in txs:
                if tx.is_transfer:
                    if tx.transfer_direction == "to":
                        balance += tx.amount
                    else:
                        balance -= tx.amount
                elif tx.category_rel and tx.category_rel.type == "income":
                    balance += tx.amount
                else:
                    balance -= tx.amount

            balances.append(
                AccountBalance(
                    account_id=str(account.id),
                    account_name=account.name,
                    account_type=account.type,
                    balance=balance,
                )
            )

        return balances

    async def get_expense_by_id(self, user_id: str, expense_id: str) -> ExpenseSchema:
        """Get single expense with ownership check"""
        transaction = (
            self.db.query(Transaction)
            .options(joinedload(Transaction.category_rel), joinedload(Transaction.account_rel))
            .filter(Transaction.id == expense_id, Transaction.user_id == user_id)
            .first()
        )
        if not transaction:
            raise HTTPException(status_code=404, detail="Expense not found")

        return self._to_schema(transaction)

    async def create_expense(self, user_id: str, data: ExpenseCreateRequest) -> ExpenseSchema:
        """Create a new expense"""
        created_at = data.created_at or datetime.now(UTC)

        # Resolve account_id: use provided or fall back to user's default
        account_id = data.account_id
        if not account_id:
            user = self.db.query(User).filter(User.id == user_id).first()
            if user and user.default_account_id:
                account_id = str(user.default_account_id)
            else:
                # Fall back to first account
                first_account = (
                    self.db.query(Account)
                    .filter(Account.user_id == user_id)
                    .order_by(Account.display_order)
                    .first()
                )
                if first_account:
                    account_id = str(first_account.id)

        transaction = Transaction(
            user_id=user_id,
            amount=data.amount,
            category_id=data.category_id,
            account_id=account_id,
            notes=data.description,
            timestamp=created_at,
            currency=data.currency,
            is_opening_balance=data.is_opening_balance,
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
        if data.category_id is not None:
            transaction.category_id = data.category_id
        if data.description is not None:
            transaction.notes = data.description
        if data.currency is not None:
            transaction.currency = data.currency
        if data.created_at is not None:
            transaction.timestamp = data.created_at
        if data.is_opening_balance is not None:
            transaction.is_opening_balance = data.is_opening_balance
        if data.account_id is not None:
            transaction.account_id = data.account_id

        self.db.commit()
        self.db.refresh(transaction)

        return self._to_schema(transaction)

    async def delete_expense(self, user_id: str, expense_id: str) -> bool:
        """Delete an expense with ownership verification. Also deletes linked transfer."""
        transaction = (
            self.db.query(Transaction)
            .filter(Transaction.id == expense_id, Transaction.user_id == user_id)
            .first()
        )
        if not transaction:
            raise HTTPException(status_code=404, detail="Expense not found")

        # If this is a transfer, delete the linked transaction too
        if transaction.linked_transaction_id:
            linked = (
                self.db.query(Transaction)
                .filter(Transaction.id == transaction.linked_transaction_id)
                .first()
            )
            if linked:
                # Clear linked refs to avoid FK constraint issues
                linked.linked_transaction_id = None
                transaction.linked_transaction_id = None
                self.db.flush()
                self.db.delete(linked)

        self.db.delete(transaction)
        self.db.commit()
        return True

    @staticmethod
    def _to_schema(transaction: Transaction) -> ExpenseSchema:
        """Convert a Transaction ORM object to ExpenseSchema"""
        cat = transaction.category_rel
        account = transaction.account_rel
        return ExpenseSchema(
            id=str(transaction.id),
            amount=transaction.amount,
            category_id=str(transaction.category_id) if transaction.category_id else None,
            category_name=cat.name if cat else "Transfer",
            category_color_light=cat.color_light if cat else "#6B7280",
            category_color_dark=cat.color_dark if cat else "#9CA3AF",
            category_type=cat.type if cat else "transfer",
            description=transaction.notes or "",
            created_at=transaction.timestamp,
            currency=transaction.currency,
            is_opening_balance=transaction.is_opening_balance,
            account_id=str(transaction.account_id),
            account_name=account.name if account else "",
            is_transfer=transaction.is_transfer,
            linked_transaction_id=str(transaction.linked_transaction_id)
            if transaction.linked_transaction_id
            else None,
            transfer_direction=transaction.transfer_direction,
        )
