"""Add email_verified to users, create email_events and email_suppressions tables.

Revision ID: 011
Revises: 010
Create Date: 2026-03-17
"""

import sqlalchemy as sa

from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add email_verified column to users
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="false"),
    )

    # Create email_events table
    op.create_table(
        "email_events",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email_hash", sa.String(), nullable=False, index=True),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("provider_message_id", sa.String(), nullable=True),
        sa.Column("raw_payload", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # Create email_suppressions table
    op.create_table(
        "email_suppressions",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email_hash", sa.String(), nullable=False, unique=True, index=True),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("email_suppressions")
    op.drop_table("email_events")
    op.drop_column("users", "email_verified")
