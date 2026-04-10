"""Add dashboard_spaces and dashboard_widgets tables for composable dashboard.

Revision ID: 014
Revises: 013
Create Date: 2026-04-11
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

from alembic import op

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dashboard_spaces",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("user_id", "name", name="uq_dashboard_space_user_name"),
    )
    op.create_index("ix_dashboard_spaces_user_id", "dashboard_spaces", ["user_id"])

    op.create_table(
        "dashboard_widgets",
        sa.Column(
            "id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column(
            "space_id",
            UUID(as_uuid=True),
            sa.ForeignKey("dashboard_spaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("widget_type", sa.String(length=40), nullable=False),
        sa.Column("col_x", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("col_y", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("col_span", sa.Integer(), nullable=False, server_default=sa.text("6")),
        sa.Column("row_span", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("config", JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_dashboard_widgets_space_id", "dashboard_widgets", ["space_id"])


def downgrade() -> None:
    op.drop_index("ix_dashboard_widgets_space_id", table_name="dashboard_widgets")
    op.drop_table("dashboard_widgets")
    op.drop_index("ix_dashboard_spaces_user_id", table_name="dashboard_spaces")
    op.drop_table("dashboard_spaces")
