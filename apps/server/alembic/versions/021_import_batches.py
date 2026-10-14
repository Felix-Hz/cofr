"""import batches

Revision ID: 021
Revises: 020
Create Date: 2026-10-14
"""

import sqlalchemy as sa

from alembic import op

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "import_batches",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "account_id",
            sa.Uuid(),
            sa.ForeignKey("accounts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("source_format", sa.String(40), nullable=False),
        sa.Column("account_ref", sa.String(40), nullable=True),
        sa.Column("filename", sa.String(255), nullable=False, server_default=""),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("imported_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skipped_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("date_from", sa.Date(), nullable=True),
        sa.Column("date_to", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_import_batches_user_id", "import_batches", ["user_id"])
    op.add_column(
        "transactions",
        sa.Column(
            "import_batch_id",
            sa.Uuid(),
            sa.ForeignKey("import_batches.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_transactions_import_batch_id", "transactions", ["import_batch_id"])


def downgrade() -> None:
    op.drop_index("ix_transactions_import_batch_id", table_name="transactions")
    op.drop_column("transactions", "import_batch_id")
    op.drop_index("ix_import_batches_user_id", table_name="import_batches")
    op.drop_table("import_batches")
