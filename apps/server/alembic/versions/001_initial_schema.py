"""initial_schema

Revision ID: 001
Revises:
Create Date: 2026-02-28

Fresh PostgreSQL baseline — all tables from models.py.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("first_name", sa.String(), nullable=False, server_default=""),
        sa.Column("last_name", sa.String(), nullable=False, server_default=""),
        sa.Column("username", sa.String(), nullable=False, server_default=""),
        sa.Column("preferred_currency", sa.String(), nullable=False, server_default="NZD"),
        sa.Column("link_code", sa.String(), nullable=True),
        sa.Column("link_code_expires", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "transactions",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(), nullable=False, server_default="NZD"),
        sa.Column("notes", sa.String(), nullable=False, server_default=""),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("inserted_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("hash", sa.String(), nullable=True),
    )
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])
    op.create_index("ix_transactions_category", "transactions", ["category"])
    op.create_index("ix_transactions_currency", "transactions", ["currency"])
    op.create_index("ix_transactions_hash", "transactions", ["hash"], unique=True)

    op.create_table(
        "offsets",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("offset", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "auth_providers",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("provider_user_id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.UniqueConstraint("provider", "provider_user_id"),
    )
    op.create_index("ix_auth_providers_user_id", "auth_providers", ["user_id"])
    op.create_index("ix_auth_providers_provider", "auth_providers", ["provider"])


def downgrade() -> None:
    op.drop_table("auth_providers")
    op.drop_table("offsets")
    op.drop_table("transactions")
    op.drop_table("users")
