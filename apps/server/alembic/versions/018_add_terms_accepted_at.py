"""add terms_accepted_at to users

Revision ID: 018
Revises: 017
Create Date: 2026-04-26

Existing users are backfilled with the migration timestamp to reflect
retroactive acceptance of the Terms of Service and Privacy Policy.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "018"
down_revision: str = "017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "terms_accepted_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    # Backfill existing users with the migration timestamp
    op.execute("UPDATE users SET terms_accepted_at = NOW() WHERE terms_accepted_at IS NULL")


def downgrade() -> None:
    op.drop_column("users", "terms_accepted_at")
