"""add is_opening_balance to transactions

Revision ID: 008
Revises: 007
Create Date: 2026-03-15

Add is_opening_balance boolean column to transactions table.
Opening balance transactions are excluded from period stats but remain visible in transaction lists.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "008"
down_revision: str = "007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column(
            "is_opening_balance", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
    )


def downgrade() -> None:
    op.drop_column("transactions", "is_opening_balance")
