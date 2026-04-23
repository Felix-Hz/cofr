"""Add recurring rules, user timezone, and recurring linkage on transactions.

Revision ID: 016
Revises: 015
Create Date: 2026-04-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision: str = "016"
down_revision: str = "015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. users.timezone (IANA, nullable; null => treat as UTC)
    op.add_column(
        "users",
        sa.Column("timezone", sa.String(length=64), nullable=True),
    )

    # 2. recurring_rules table
    op.create_table(
        "recurring_rules",
        sa.Column(
            "id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(length=10), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column(
            "account_id",
            UUID(as_uuid=True),
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "to_account_id",
            UUID(as_uuid=True),
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "category_id",
            UUID(as_uuid=True),
            sa.ForeignKey("categories.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("merchant", sa.String(length=120), nullable=True),
        sa.Column("description", sa.String(length=360), nullable=False, server_default=""),
        sa.Column("interval_unit", sa.String(length=8), nullable=False),
        sa.Column("interval_count", sa.SmallInteger(), nullable=False, server_default=sa.text("1")),
        sa.Column("day_of_month", sa.SmallInteger(), nullable=True),
        sa.Column("day_of_week", sa.SmallInteger(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("next_due_at", sa.Date(), nullable=False),
        sa.Column("last_materialized_at", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_recurring_rules_user_id", "recurring_rules", ["user_id"])
    op.create_index(
        "ix_recurring_rules_due",
        "recurring_rules",
        ["is_active", "next_due_at"],
    )

    # 3. transactions.recurring_rule_id: marks materialized rows
    op.add_column(
        "transactions",
        sa.Column("recurring_rule_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_transactions_recurring_rule",
        "transactions",
        "recurring_rules",
        ["recurring_rule_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_transactions_recurring_rule_id",
        "transactions",
        ["recurring_rule_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_transactions_recurring_rule_id", table_name="transactions")
    op.drop_constraint("fk_transactions_recurring_rule", "transactions", type_="foreignkey")
    op.drop_column("transactions", "recurring_rule_id")
    op.drop_index("ix_recurring_rules_due", table_name="recurring_rules")
    op.drop_index("ix_recurring_rules_user_id", table_name="recurring_rules")
    op.drop_table("recurring_rules")
    op.drop_column("users", "timezone")
