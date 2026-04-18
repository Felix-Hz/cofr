"""add analytics query optimization indexes

Revision ID: 017
Revises: 016
Create Date: 2026-04-18

Add indexes to optimize dashboard analytics queries that
aggregate transactions by category type and merchant lookups.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "017"
down_revision: str = "016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_transactions_user_merchant",
        "transactions",
        ["user_id", "merchant"],
    )

    op.create_index(
        "ix_transactions_timestamp_type",
        "transactions",
        ["timestamp", "is_opening_balance", "is_transfer"],
    )

    op.execute(
        """
        CREATE INDEX ix_transactions_analytics
        ON transactions (user_id, timestamp, is_opening_balance, is_transfer)
        WHERE is_opening_balance = false AND is_transfer = false
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_transactions_analytics")
    op.drop_index("ix_transactions_timestamp_type", table_name="transactions")
    op.drop_index("ix_transactions_user_merchant", table_name="transactions")
