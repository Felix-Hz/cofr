from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import case, func, or_
from sqlalchemy import false as sa_false
from sqlalchemy.orm import Session, joinedload

from app.db.models import Account, Category, ExchangeRate, Transaction, User
from app.db.schemas import (
    AccountBalance,
    CategoryTotal,
    ExpenseCreateRequest,
    ExpenseSchema,
    ExpenseUpdateRequest,
    LifetimeStats,
    MonthlyStats,
    SparklinePoint,
    SparklineResponse,
)


class ExpenseService:
    def __init__(self, db: Session):
        self.db = db

    def _paginated_query(
        self, filters: list, limit: int, offset: int
    ) -> tuple[list[ExpenseSchema], int]:
        """Run a paginated transaction query with total count via window function (single DB round trip)."""
        total_count = func.count(Transaction.id).over()

        rows = (
            self.db.query(Transaction, total_count.label("_total"))
            .options(joinedload(Transaction.category_rel), joinedload(Transaction.account_rel))
            .filter(*filters)
            .order_by(Transaction.timestamp.desc(), Transaction.inserted_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )

        if not rows:
            return [], 0

        total = rows[0]._total
        expenses = [self._to_schema(tx) for tx, _ in rows]
        return expenses, total

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
        collapse_transfer_pairs: bool = False,
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
        if collapse_transfer_pairs:
            filters.append(
                or_(
                    Transaction.is_transfer == sa_false(),
                    Transaction.transfer_direction == "from",
                    Transaction.transfer_direction.is_(None),
                )
            )

        return self._paginated_query(filters, limit, offset)

    async def get_expenses_by_category(
        self, user_id: str, category_id: str, limit: int = 50, offset: int = 0
    ) -> tuple[list[ExpenseSchema], int]:
        """Get paginated expenses filtered by category"""
        filters = [Transaction.user_id == user_id, Transaction.category_id == category_id]
        return self._paginated_query(filters, limit, offset)

    async def get_expenses_by_date_range(
        self,
        user_id: str,
        start_date: datetime,
        end_date: datetime,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[ExpenseSchema], int]:
        """Get paginated expenses within a date range"""
        filters = [
            Transaction.user_id == user_id,
            Transaction.timestamp >= start_date,
            Transaction.timestamp <= end_date,
        ]
        return self._paginated_query(filters, limit, offset)

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
        stats.savings_net_change = self._get_savings_net_change_monthly(
            user_id, month, year, currency
        )
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
        stats.savings_net_change = self._get_savings_net_change_range(
            user_id, start_date, end_date, currency
        )
        return stats

    def _savings_net_change_query(self, savings_filter: list) -> float:
        """Calculate net flow into savings/investment accounts (single-currency)."""
        result = (
            self.db.query(
                func.coalesce(
                    func.sum(
                        case(
                            (
                                Transaction.is_transfer == True,  # noqa: E712
                                case(
                                    (Transaction.transfer_direction == "to", Transaction.amount),
                                    else_=-Transaction.amount,
                                ),
                            ),
                            (Category.type == "income", Transaction.amount),
                            else_=-Transaction.amount,
                        )
                    ),
                    0,
                )
            )
            .outerjoin(Category, Transaction.category_id == Category.id)
            .join(Account, Transaction.account_id == Account.id)
            .filter(*savings_filter)
            .scalar()
        )
        return float(result or 0)

    def _savings_net_change_converted(self, savings_filter: list, user_id: str) -> float:
        """Calculate net flow into savings/investment accounts with currency conversion."""
        user = self.db.query(User).filter(User.id == user_id).first()
        preferred = user.preferred_currency if user else "USD"

        target_rate = (
            self.db.query(ExchangeRate.rate_to_usd)
            .filter(ExchangeRate.currency_code == preferred)
            .scalar_subquery()
        )

        converted_amount = Transaction.amount / ExchangeRate.rate_to_usd * target_rate

        result = (
            self.db.query(
                func.coalesce(
                    func.sum(
                        case(
                            (
                                Transaction.is_transfer == True,  # noqa: E712
                                case(
                                    (Transaction.transfer_direction == "to", converted_amount),
                                    else_=-converted_amount,
                                ),
                            ),
                            (Category.type == "income", converted_amount),
                            else_=-converted_amount,
                        )
                    ),
                    0,
                )
            )
            .outerjoin(Category, Transaction.category_id == Category.id)
            .join(Account, Transaction.account_id == Account.id)
            .join(ExchangeRate, ExchangeRate.currency_code == Transaction.currency)
            .filter(*savings_filter)
            .scalar()
        )
        return float(result or 0)

    def _get_savings_net_change_range(
        self, user_id: str, start_date: datetime, end_date: datetime, currency: str | None = None
    ) -> float:
        """Net flow into savings/investment accounts for a date range."""
        savings_filter = [
            Transaction.user_id == user_id,
            Transaction.timestamp >= start_date,
            Transaction.timestamp <= end_date,
            Transaction.is_opening_balance == sa_false(),
            Account.type.in_(["savings", "investment"]),
        ]
        if currency:
            savings_filter.append(Transaction.currency == currency)
            return self._savings_net_change_query(savings_filter)
        return self._savings_net_change_converted(savings_filter, user_id)

    def _get_savings_net_change_monthly(
        self, user_id: str, month: int, year: int, currency: str | None = None
    ) -> float:
        """Net flow into savings/investment accounts for a specific month."""
        savings_filter = [
            Transaction.user_id == user_id,
            func.extract("month", Transaction.timestamp) == month,
            func.extract("year", Transaction.timestamp) == year,
            Transaction.is_opening_balance == sa_false(),
            Account.type.in_(["savings", "investment"]),
        ]
        if currency:
            savings_filter.append(Transaction.currency == currency)
            return self._savings_net_change_query(savings_filter)
        return self._savings_net_change_converted(savings_filter, user_id)

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
        """Aggregate with currency conversion done in SQL via exchange_rates join."""
        user = self.db.query(User).filter(User.id == user_id).first()
        preferred = user.preferred_currency if user else "USD"

        # Subquery for the target currency rate
        target_rate = (
            self.db.query(ExchangeRate.rate_to_usd)
            .filter(ExchangeRate.currency_code == preferred)
            .scalar_subquery()
        )

        # Conversion formula: amount / from_rate * to_rate
        # ExchangeRate stores rate_to_usd (e.g., NZD=1.6, USD=1.0)
        # So: amount_in_preferred = amount / from_rate * target_rate
        converted_amount = Transaction.amount / ExchangeRate.rate_to_usd * target_rate

        # Summary aggregation
        summary = (
            self.db.query(
                func.coalesce(
                    func.sum(case((Category.type == "expense", converted_amount), else_=0)), 0
                ).label("total_spent"),
                func.coalesce(
                    func.sum(case((Category.type == "income", converted_amount), else_=0)), 0
                ).label("total_income"),
                func.count(case((Category.type == "expense", 1))).label("expense_count"),
                func.count(Transaction.id).label("transaction_count"),
            )
            .join(Category, Transaction.category_id == Category.id)
            .join(ExchangeRate, ExchangeRate.currency_code == Transaction.currency)
            .filter(*base_filter)
            .first()
        )

        # Category breakdown
        breakdown = (
            self.db.query(
                Transaction.category_id,
                Category.name.label("category_name"),
                Category.type.label("category_type"),
                Category.color_light,
                Category.color_dark,
                func.sum(converted_amount).label("total"),
                func.count(Transaction.id).label("count"),
            )
            .join(Category, Transaction.category_id == Category.id)
            .join(ExchangeRate, ExchangeRate.currency_code == Transaction.currency)
            .filter(*base_filter)
            .group_by(
                Transaction.category_id,
                Category.name,
                Category.type,
                Category.color_light,
                Category.color_dark,
            )
            .order_by(func.sum(converted_amount).desc())
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
            currency=preferred,
            is_converted=True,
        )

    def get_account_balances(
        self, user_id: str, currency: str | None = None
    ) -> list[AccountBalance]:
        """Calculate balance for each of the user's accounts.

        If `currency` is provided, balances are filtered to only transactions in
        that currency (no conversion). Otherwise converts all to preferred currency.
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        preferred = currency or (user.preferred_currency if user else "USD")

        # Target currency rate for conversion
        target_rate = (
            self.db.query(ExchangeRate.rate_to_usd)
            .filter(ExchangeRate.currency_code == preferred)
            .scalar_subquery()
        )

        # Convert each transaction amount: amount / from_rate * target_rate
        # Falls back to raw amount when exchange rates are unavailable
        converted_amount = case(
            (
                ExchangeRate.rate_to_usd.isnot(None),
                Transaction.amount / ExchangeRate.rate_to_usd * target_rate,
            ),
            else_=Transaction.amount,
        )

        # Single query: aggregate all transaction amounts per account with correct sign
        # - income category or transfer 'to' → positive
        # - expense category or transfer 'from' → negative
        balance_filters = [Transaction.user_id == user_id]
        if currency:
            balance_filters.append(Transaction.currency == currency)

        balance_subq = (
            self.db.query(
                Transaction.account_id,
                func.coalesce(
                    func.sum(
                        case(
                            (
                                Transaction.is_transfer == True,  # noqa: E712
                                case(
                                    (Transaction.transfer_direction == "to", converted_amount),
                                    else_=-converted_amount,
                                ),
                            ),
                            (Category.type == "income", converted_amount),
                            else_=-converted_amount,
                        )
                    ),
                    0,
                ).label("balance"),
            )
            .outerjoin(Category, Transaction.category_id == Category.id)
            .outerjoin(ExchangeRate, ExchangeRate.currency_code == Transaction.currency)
            .filter(*balance_filters)
            .group_by(Transaction.account_id)
            .subquery()
        )

        results = (
            self.db.query(
                Account.id,
                Account.name,
                Account.type,
                func.coalesce(balance_subq.c.balance, 0).label("balance"),
            )
            .outerjoin(balance_subq, Account.id == balance_subq.c.account_id)
            .filter(Account.user_id == user_id)
            .order_by(Account.display_order)
            .all()
        )

        return [
            AccountBalance(
                account_id=str(row.id),
                account_name=row.name,
                account_type=row.type,
                balance=row.balance,
            )
            for row in results
        ]

    def get_lifetime_stats(self, user_id: str, currency: str | None = None) -> LifetimeStats:
        """All-time aggregates: net worth, balances by account type, lifetime income/spent."""
        balances = self.get_account_balances(user_id)
        checking = sum(b.balance for b in balances if b.account_type == "checking")
        savings = sum(b.balance for b in balances if b.account_type == "savings")
        investment = sum(b.balance for b in balances if b.account_type == "investment")
        net_worth = sum(b.balance for b in balances)

        base_filter = [
            Transaction.user_id == user_id,
            Transaction.is_opening_balance == sa_false(),
            Transaction.is_transfer == sa_false(),
        ]
        if currency:
            base_filter.append(Transaction.currency == currency)
            stats = self._aggregate_sql(base_filter, currency)
            resolved_currency = currency
            is_converted = False
        else:
            stats = self._aggregate_with_conversion(base_filter, user_id)
            user = self.db.query(User).filter(User.id == user_id).first()
            resolved_currency = user.preferred_currency if user else "USD"
            is_converted = True

        return LifetimeStats(
            net_worth=net_worth,
            savings_balance=savings,
            investment_balance=investment,
            checking_balance=checking,
            lifetime_income=stats.total_income,
            lifetime_spent=stats.total_spent,
            currency=resolved_currency,
            is_converted=is_converted,
        )

    def get_spend_sparkline(
        self,
        user_id: str,
        start_date: datetime,
        end_date: datetime,
        currency: str | None = None,
        tz_offset_minutes: int = 0,
    ) -> SparklineResponse:
        """Daily spend totals between start_date and end_date (inclusive).

        Uses Python-side grouping for cross-DB compatibility (SQLite lacks extract()).

        ``tz_offset_minutes`` is the client's offset from UTC (positive for east of
        UTC, e.g. NZT = 780). Timestamps are shifted by this amount before bucketing
        so the day boundaries match the user's local calendar.
        """
        from datetime import timedelta as _td

        offset = _td(minutes=tz_offset_minutes)

        filters = [
            Transaction.user_id == user_id,
            Transaction.timestamp >= start_date,
            Transaction.timestamp <= end_date,
            Transaction.is_opening_balance == sa_false(),
            Transaction.is_transfer == sa_false(),
        ]
        if currency:
            filters.append(Transaction.currency == currency)
            resolved_currency = currency
            is_converted = False

            rows = (
                self.db.query(Transaction.timestamp, Transaction.amount)
                .join(Category, Transaction.category_id == Category.id)
                .filter(*filters, Category.type == "expense")
                .all()
            )
            totals: dict[str, float] = {}
            for ts, amount in rows:
                ts_naive = ts.replace(tzinfo=None) if ts.tzinfo else ts
                key = (ts_naive + offset).date().isoformat()
                totals[key] = totals.get(key, 0.0) + float(amount)
        else:
            user = self.db.query(User).filter(User.id == user_id).first()
            resolved_currency = user.preferred_currency if user else "USD"
            is_converted = True

            target_rate = (
                self.db.query(ExchangeRate.rate_to_usd)
                .filter(ExchangeRate.currency_code == resolved_currency)
                .scalar_subquery()
            )
            converted_amount = Transaction.amount / ExchangeRate.rate_to_usd * target_rate

            rows = (
                self.db.query(Transaction.timestamp, converted_amount.label("amt"))
                .join(Category, Transaction.category_id == Category.id)
                .join(ExchangeRate, ExchangeRate.currency_code == Transaction.currency)
                .filter(*filters, Category.type == "expense")
                .all()
            )
            totals = {}
            for ts, amount in rows:
                ts_naive = ts.replace(tzinfo=None) if ts.tzinfo else ts
                key = (ts_naive + offset).date().isoformat()
                totals[key] = totals.get(key, 0.0) + float(amount or 0)

        # Backfill every day in the range so sparkline renders a continuous line
        # even when only a handful of days have transactions.
        start_day = start_date.date()
        end_day = end_date.date()
        points: list[SparklinePoint] = []
        cursor = start_day
        while cursor <= end_day:
            key = cursor.isoformat()
            points.append(SparklinePoint(date=key, total=totals.get(key, 0.0)))
            cursor += _td(days=1)

        return SparklineResponse(
            points=points, currency=resolved_currency, is_converted=is_converted
        )

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
            merchant=(data.merchant or None),
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
        if data.merchant is not None:
            transaction.merchant = data.merchant or None
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

    def _to_schema(self, transaction: Transaction) -> ExpenseSchema:
        """Convert a Transaction ORM object to ExpenseSchema"""
        cat = transaction.category_rel
        account = transaction.account_rel
        linked_account_name = None
        if transaction.is_transfer and transaction.transfer_direction == "from":
            linked_account_name = (
                self.db.query(Account.name)
                .join(Transaction, Transaction.account_id == Account.id)
                .filter(Transaction.id == transaction.linked_transaction_id)
                .scalar()
            )
        return ExpenseSchema(
            id=str(transaction.id),
            amount=transaction.amount,
            category_id=str(transaction.category_id) if transaction.category_id else None,
            category_name=cat.name if cat else "Transfer",
            category_color_light=cat.color_light if cat else "#6B7280",
            category_color_dark=cat.color_dark if cat else "#9CA3AF",
            category_type=cat.type if cat else "transfer",
            description=transaction.notes or "",
            merchant=transaction.merchant,
            created_at=transaction.timestamp,
            currency=transaction.currency,
            is_opening_balance=transaction.is_opening_balance,
            account_id=str(transaction.account_id),
            account_name=account.name if account else "",
            is_transfer=transaction.is_transfer,
            linked_transaction_id=str(transaction.linked_transaction_id)
            if transaction.linked_transaction_id
            else None,
            linked_account_name=linked_account_name,
            transfer_direction=transaction.transfer_direction,
            recurring_rule_id=str(transaction.recurring_rule_id)
            if transaction.recurring_rule_id
            else None,
        )
