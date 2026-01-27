"""baseline_schema

Revision ID: 001_baseline
Revises:
Create Date: 2026-01-26

This is a baseline migration. For existing databases (created by GORM/remind0),
run `alembic stamp head` to mark it as applied WITHOUT executing.
For fresh databases, the upgrade() will create the tables.
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = inspector.get_table_names()

    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("first_name", sa.String(), nullable=False, server_default=""),
            sa.Column("last_name", sa.String(), nullable=False, server_default=""),
            sa.Column("username", sa.String(), nullable=False, server_default=""),
            sa.Column("preferred_currency", sa.String(), nullable=False, server_default="NZD"),
        )
        op.create_index("ix_users_user_id", "users", ["user_id"], unique=True)
        op.create_index("ix_users_first_name", "users", ["first_name"])
        op.create_index("ix_users_last_name", "users", ["last_name"])
        op.create_index("ix_users_username", "users", ["username"], unique=True)

    if "transactions" not in existing_tables:
        op.create_table(
            "transactions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("category", sa.String(), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("currency", sa.String(), nullable=False, server_default="NZD"),
            sa.Column("notes", sa.String(), nullable=False, server_default=""),
            sa.Column("timestamp", sa.DateTime(), nullable=False),
            sa.Column("hash", sa.String(), nullable=True),
        )
        op.create_index("ix_transactions_user_id", "transactions", ["user_id"])
        op.create_index("ix_transactions_category", "transactions", ["category"])
        op.create_index("ix_transactions_currency", "transactions", ["currency"])
        op.create_index("ix_transactions_hash", "transactions", ["hash"], unique=True)

    if "offsets" not in existing_tables:
        op.create_table(
            "offsets",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("offset", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    op.drop_table("offsets")
    op.drop_table("transactions")
    op.drop_table("users")
