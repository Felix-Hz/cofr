"""add_auth_providers

Revision ID: 002_auth_providers
Revises: 001_baseline
Create Date: 2026-01-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text

# revision identifiers, used by Alembic.
revision: str = "002_auth_providers"
down_revision: Union[str, None] = "001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create auth_providers table (idempotent — may already exist from partial run)
    connection = op.get_bind()
    inspector = inspect(connection)
    existing_tables = inspector.get_table_names()

    if "auth_providers" not in existing_tables:
        op.create_table(
            "auth_providers",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("provider", sa.String(), nullable=False),
            sa.Column("provider_user_id", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=True),
            sa.Column("display_name", sa.String(), nullable=True),
            sa.UniqueConstraint("provider", "provider_user_id"),
        )
        op.create_index("ix_auth_providers_user_id", "auth_providers", ["user_id"])
        op.create_index("ix_auth_providers_provider", "auth_providers", ["provider"])

    # 2. users.user_id is already nullable (GORM creates columns nullable by default).
    #    No ALTER TABLE needed.

    # 3. Data migration: populate auth_providers from existing users
    users = connection.execute(text("SELECT id, user_id, username FROM users")).fetchall()
    for user in users:
        if user[1] is not None:  # user_id (telegram ID) is not null
            connection.execute(
                text(
                    "INSERT INTO auth_providers (user_id, provider, provider_user_id, display_name) "
                    "VALUES (:uid, 'telegram', :tid, :name)"
                ),
                {"uid": user[0], "tid": str(user[1]), "name": user[2]},
            )


def downgrade() -> None:
    op.drop_index("ix_auth_providers_provider", table_name="auth_providers")
    op.drop_index("ix_auth_providers_user_id", table_name="auth_providers")
    op.drop_table("auth_providers")
