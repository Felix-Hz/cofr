"""add receipt_file_id to transactions

Revision ID: 007
Revises: 006
Create Date: 2026-03-15

Add receipt_file_id column to transactions table for Telegram receipt photo attachments.
Stores Telegram's file_id reference (no actual image storage needed).
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "007"
down_revision: str = "006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("receipt_file_id", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("transactions", "receipt_file_id")
