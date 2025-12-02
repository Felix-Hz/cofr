from datetime import datetime

import libsql_client

from app.db.schemas import CategoryTotal, ExpenseSchema, MonthlyStats


class ExpenseService:
    def __init__(self, db: libsql_client.Client):
        self.db = db

    async def get_expenses(
        self, telegram_id: str, limit: int = 50, offset: int = 0
    ) -> tuple[list[ExpenseSchema], int]:
        """Get paginated expenses for a user"""
        telegram_id_int = int(telegram_id)

        count_total_query = """
            SELECT COUNT(t.id) as total
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE u.user_id = ?
        """
        count_result = self.db.execute(count_total_query, [telegram_id_int])
        total = count_result.rows[0]["total"] if count_result.rows else 0

        data_query = """
            SELECT t.id, t.amount, t.category, t.notes, t.timestamp, t.currency
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE u.user_id = ?
            ORDER BY t.timestamp DESC, t.id DESC
            LIMIT ? OFFSET ?
        """
        data_result = self.db.execute(data_query, [telegram_id_int, limit, offset])

        expenses = [
            ExpenseSchema.from_row(
                dict(zip(data_result.columns, row, strict=False)), telegram_id_int
            )
            for row in data_result.rows
        ]

        return expenses, total

    async def get_expenses_by_category(
        self, telegram_id: str, category: str, limit: int = 50, offset: int = 0
    ) -> tuple[list[ExpenseSchema], int]:
        """Get paginated expenses filtered by category"""
        telegram_id_int = int(telegram_id)

        count_total_query = """
            SELECT COUNT(t.id) as total
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE u.user_id = ? AND t.category = ?
        """
        count_result = self.db.execute(count_total_query, [telegram_id_int, category])
        total = count_result.rows[0]["total"] if count_result.rows else 0

        data_query = """
            SELECT t.id, t.amount, t.category, t.notes, t.timestamp, t.currency
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE u.user_id = ? AND t.category = ?
            ORDER BY t.timestamp DESC, t.id DESC
            LIMIT ? OFFSET ?
        """
        data_result = self.db.execute(data_query, [telegram_id_int, category, limit, offset])

        expenses = [
            ExpenseSchema.from_row(
                dict(zip(data_result.columns, row, strict=False)), telegram_id_int
            )
            for row in data_result.rows
        ]

        return expenses, total

    async def get_expenses_by_date_range(
        self,
        telegram_id: str,
        start_date: datetime,
        end_date: datetime,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[ExpenseSchema], int]:
        """Get paginated expenses within a date range"""
        telegram_id_int = int(telegram_id)
        start_str = start_date.isoformat()
        end_str = end_date.isoformat()

        count_total_query = """
            SELECT COUNT(t.id) as total
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE u.user_id = ? AND t.timestamp >= ? AND t.timestamp <= ?
        """
        count_result = self.db.execute(count_total_query, [telegram_id_int, start_str, end_str])
        total = count_result.rows[0]["total"] if count_result.rows else 0

        data_query = """
            SELECT t.id, t.amount, t.category, t.notes, t.timestamp, t.currency
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE u.user_id = ? AND t.timestamp >= ? AND t.timestamp <= ?
            ORDER BY t.timestamp DESC, t.id DESC
            LIMIT ? OFFSET ?
        """
        data_result = self.db.execute(
            data_query, [telegram_id_int, start_str, end_str, limit, offset]
        )

        expenses = [
            ExpenseSchema.from_row(
                dict(zip(data_result.columns, row, strict=False)), telegram_id_int
            )
            for row in data_result.rows
        ]

        return expenses, total

    async def get_monthly_stats(self, telegram_id: str, month: int, year: int) -> MonthlyStats:
        """Get monthly statistics with category breakdown"""
        telegram_id_int = int(telegram_id)

        summary_query = """
            SELECT
                COALESCE(SUM(t.amount), 0) as total_spent,
                COUNT(t.id) as transaction_count
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE u.user_id = ?
                AND strftime('%m', t.timestamp) = ?
                AND strftime('%Y', t.timestamp) = ?
        """
        summary_result = self.db.execute(
            summary_query, [telegram_id_int, f"{month:02d}", str(year)]
        )
        summary = summary_result.rows[0] if summary_result.rows else {}

        category_breakdown_query = """
            SELECT
                t.category,
                SUM(t.amount) as total,
                COUNT(t.id) as count
            FROM transactions t
            JOIN users u ON t.user_id = u.id
            WHERE u.user_id = ?
                AND strftime('%m', t.timestamp) = ?
                AND strftime('%Y', t.timestamp) = ?
            GROUP BY t.category
            ORDER BY SUM(t.amount) DESC
        """
        breakdown_result = self.db.execute(
            category_breakdown_query, [telegram_id_int, f"{month:02d}", str(year)]
        )

        category_breakdown = [
            CategoryTotal(category=row["category"], total=row["total"], count=row["count"])
            for row in breakdown_result.rows
        ]

        return MonthlyStats(
            total_spent=summary.get("total_spent", 0),
            transaction_count=summary.get("transaction_count", 0),
            category_breakdown=category_breakdown,
        )
