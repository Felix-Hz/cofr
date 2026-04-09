"""Remove Telegram bot artifacts: offsets table, receipt_file_id, link_code columns.

Revision ID: 013
Revises: 012
Create Date: 2026-04-09
"""

import sqlalchemy as sa

from alembic import op

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("offsets")
    op.drop_column("transactions", "receipt_file_id")
    op.drop_column("users", "link_code")
    op.drop_column("users", "link_code_expires")


def downgrade() -> None:
    op.add_column("users", sa.Column("link_code_expires", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("link_code", sa.String(), nullable=True))
    op.add_column("transactions", sa.Column("receipt_file_id", sa.String(), nullable=True))
    op.create_table(
        "offsets",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("offset", sa.Integer(), default=0),
    )
