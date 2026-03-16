"""add performance indexes for common query patterns

Revision ID: 010
Revises: 009
Create Date: 2026-03-16

Add composite and partial indexes to optimize dashboard queries,
stats aggregation, and account balance calculations.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "010"
down_revision: str = "009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Composite index for the most common query pattern:
    # WHERE user_id = ? AND timestamp BETWEEN ? AND ?
    # Covers: get_expenses, get_range_stats, get_monthly_stats, dashboard
    op.create_index(
        "ix_transactions_user_id_timestamp",
        "transactions",
        ["user_id", "timestamp"],
    )

    # Composite index for account balance calculation:
    # WHERE account_id = ? (aggregate by account with category join)
    # Also covers transfer queries filtering by account
    op.create_index(
        "ix_transactions_account_id_is_transfer",
        "transactions",
        ["account_id", "is_transfer"],
    )

    # Partial index for non-transfer, non-opening-balance transactions
    # (stats queries always filter these out)
    op.execute(
        """
        CREATE INDEX ix_transactions_stats
        ON transactions (user_id, timestamp)
        WHERE is_transfer = false AND is_opening_balance = false
        """
    )

    # Index on categories.user_id for fetching user's custom categories
    op.create_index(
        "ix_categories_user_id",
        "categories",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_categories_user_id", table_name="categories")
    op.execute("DROP INDEX IF EXISTS ix_transactions_stats")
    op.drop_index("ix_transactions_account_id_is_transfer", table_name="transactions")
    op.drop_index("ix_transactions_user_id_timestamp", table_name="transactions")
