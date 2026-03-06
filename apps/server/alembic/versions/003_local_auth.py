"""local_auth

Revision ID: 003
Revises: 002
Create Date: 2026-03-06

Add password_hash column to auth_providers for local email/password auth.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "003"
down_revision: str = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("auth_providers", sa.Column("password_hash", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("auth_providers", "password_hash")
