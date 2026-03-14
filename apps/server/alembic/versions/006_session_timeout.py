"""session timeout

Revision ID: 006
Revises: 005
Create Date: 2026-03-14

Add session_timeout_minutes column to users table.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "006"
down_revision: str = "005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("session_timeout_minutes", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "session_timeout_minutes")
