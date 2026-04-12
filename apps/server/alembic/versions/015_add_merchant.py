"""Add merchant column to transactions.

Revision ID: 015
Revises: 014
Create Date: 2026-04-12
"""

import sqlalchemy as sa

from alembic import op

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("merchant", sa.String(length=120), nullable=True),
    )
    op.create_index("ix_transactions_merchant", "transactions", ["merchant"])


def downgrade() -> None:
    op.drop_index("ix_transactions_merchant", table_name="transactions")
    op.drop_column("transactions", "merchant")
