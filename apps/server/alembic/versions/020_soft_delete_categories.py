"""soft delete categories

Revision ID: 020
Revises: 019
Create Date: 2026-04-27
"""

import sqlalchemy as sa

from alembic import op

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("categories", "deleted_at")
