"""add accounts and transfers

Revision ID: 009
Revises: 008
Create Date: 2026-03-15

Add accounts table, transfer columns to transactions, default_account_id to users.
Migrate existing savings/investment transactions into transfers between accounts.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision: str = "009"
down_revision: str = "008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create accounts table
    op.create_table(
        "accounts",
        sa.Column(
            "id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(60), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("user_id", "name", name="uq_account_user_name"),
    )
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"])

    # 2. Add default_account_id to users (nullable initially)
    op.add_column("users", sa.Column("default_account_id", UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_users_default_account",
        "users",
        "accounts",
        ["default_account_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 3. Add account_id to transactions (nullable initially, made NOT NULL after data migration)
    op.add_column(
        "transactions",
        sa.Column("account_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_transactions_account",
        "transactions",
        "accounts",
        ["account_id"],
        ["id"],
    )

    # 4. Add transfer columns to transactions
    op.add_column(
        "transactions",
        sa.Column("linked_transaction_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_transactions_linked",
        "transactions",
        "transactions",
        ["linked_transaction_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column(
        "transactions",
        sa.Column("is_transfer", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "transactions",
        sa.Column("transfer_direction", sa.String(4), nullable=True),
    )

    # 5. Make category_id nullable on transactions (transfers have no category)
    op.alter_column("transactions", "category_id", existing_type=UUID(as_uuid=True), nullable=True)

    # 6. Data migration
    conn = op.get_bind()

    # Get all users
    users = conn.execute(sa.text("SELECT id FROM users WHERE deleted_at IS NULL")).fetchall()

    for (user_id,) in users:
        # Create 3 system accounts per user
        checking_id = conn.execute(
            sa.text(
                "INSERT INTO accounts (user_id, name, type, is_system, display_order) "
                "VALUES (:uid, 'Checking', 'checking', true, 0) RETURNING id"
            ),
            {"uid": user_id},
        ).scalar()

        savings_id = conn.execute(
            sa.text(
                "INSERT INTO accounts (user_id, name, type, is_system, display_order) "
                "VALUES (:uid, 'Savings', 'savings', true, 1) RETURNING id"
            ),
            {"uid": user_id},
        ).scalar()

        investment_id = conn.execute(
            sa.text(
                "INSERT INTO accounts (user_id, name, type, is_system, display_order) "
                "VALUES (:uid, 'Investment', 'investment', true, 2) RETURNING id"
            ),
            {"uid": user_id},
        ).scalar()

        # Set default account to Checking
        conn.execute(
            sa.text("UPDATE users SET default_account_id = :aid WHERE id = :uid"),
            {"aid": checking_id, "uid": user_id},
        )

        # Assign income/expense type transactions to Checking account
        conn.execute(
            sa.text(
                "UPDATE transactions SET account_id = :aid "
                "WHERE user_id = :uid AND category_id IN ("
                "  SELECT id FROM categories WHERE type IN ('income', 'expense')"
                ")"
            ),
            {"aid": checking_id, "uid": user_id},
        )

        # Convert savings-type transactions into transfers
        savings_txs = conn.execute(
            sa.text(
                "SELECT t.id, t.amount, t.currency, t.notes, t.timestamp, t.inserted_at, "
                "t.receipt_file_id, t.is_opening_balance "
                "FROM transactions t "
                "JOIN categories c ON c.id = t.category_id "
                "WHERE t.user_id = :uid AND c.type = 'savings'"
            ),
            {"uid": user_id},
        ).fetchall()

        for tx in savings_txs:
            tx_id = tx[0]
            # Update original tx: set as transfer 'from' Checking, clear category
            conn.execute(
                sa.text(
                    "UPDATE transactions SET account_id = :checking, is_transfer = true, "
                    "transfer_direction = 'from', category_id = NULL "
                    "WHERE id = :tid"
                ),
                {"checking": checking_id, "tid": tx_id},
            )
            # Create mirror tx in Savings account
            mirror_id = conn.execute(
                sa.text(
                    "INSERT INTO transactions "
                    "(user_id, amount, currency, notes, timestamp, inserted_at, "
                    "account_id, is_transfer, transfer_direction, linked_transaction_id, "
                    "is_opening_balance, receipt_file_id) "
                    "VALUES (:uid, :amount, :currency, :notes, :ts, :ins, "
                    ":savings, true, 'to', :linked, :ob, :receipt) "
                    "RETURNING id"
                ),
                {
                    "uid": user_id,
                    "amount": tx[1],
                    "currency": tx[2],
                    "notes": tx[3],
                    "ts": tx[4],
                    "ins": tx[5],
                    "savings": savings_id,
                    "linked": tx_id,
                    "ob": tx[7],
                    "receipt": tx[6],
                },
            ).scalar()
            # Link original to mirror
            conn.execute(
                sa.text("UPDATE transactions SET linked_transaction_id = :mid WHERE id = :tid"),
                {"mid": mirror_id, "tid": tx_id},
            )

        # Convert investment-type transactions into transfers
        invest_txs = conn.execute(
            sa.text(
                "SELECT t.id, t.amount, t.currency, t.notes, t.timestamp, t.inserted_at, "
                "t.receipt_file_id, t.is_opening_balance "
                "FROM transactions t "
                "JOIN categories c ON c.id = t.category_id "
                "WHERE t.user_id = :uid AND c.type = 'investment'"
            ),
            {"uid": user_id},
        ).fetchall()

        for tx in invest_txs:
            tx_id = tx[0]
            conn.execute(
                sa.text(
                    "UPDATE transactions SET account_id = :checking, is_transfer = true, "
                    "transfer_direction = 'from', category_id = NULL "
                    "WHERE id = :tid"
                ),
                {"checking": checking_id, "tid": tx_id},
            )
            mirror_id = conn.execute(
                sa.text(
                    "INSERT INTO transactions "
                    "(user_id, amount, currency, notes, timestamp, inserted_at, "
                    "account_id, is_transfer, transfer_direction, linked_transaction_id, "
                    "is_opening_balance, receipt_file_id) "
                    "VALUES (:uid, :amount, :currency, :notes, :ts, :ins, "
                    ":invest, true, 'to', :linked, :ob, :receipt) "
                    "RETURNING id"
                ),
                {
                    "uid": user_id,
                    "amount": tx[1],
                    "currency": tx[2],
                    "notes": tx[3],
                    "ts": tx[4],
                    "ins": tx[5],
                    "invest": investment_id,
                    "linked": tx_id,
                    "ob": tx[7],
                    "receipt": tx[6],
                },
            ).scalar()
            conn.execute(
                sa.text("UPDATE transactions SET linked_transaction_id = :mid WHERE id = :tid"),
                {"mid": mirror_id, "tid": tx_id},
            )

        # Any remaining transactions without account_id (shouldn't happen, but safety net)
        conn.execute(
            sa.text(
                "UPDATE transactions SET account_id = :checking "
                "WHERE user_id = :uid AND account_id IS NULL"
            ),
            {"checking": checking_id, "uid": user_id},
        )

    # Delete savings/investment categories and their preferences
    conn.execute(
        sa.text(
            "DELETE FROM user_category_preferences WHERE category_id IN "
            "(SELECT id FROM categories WHERE type IN ('savings', 'investment'))"
        )
    )
    conn.execute(sa.text("DELETE FROM categories WHERE type IN ('savings', 'investment')"))

    # 7. Make account_id NOT NULL now that all rows have values
    op.alter_column("transactions", "account_id", existing_type=UUID(as_uuid=True), nullable=False)

    # 8. Add indexes
    op.create_index("ix_transactions_account_id", "transactions", ["account_id"])
    op.create_index(
        "ix_transactions_linked_transaction_id", "transactions", ["linked_transaction_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_transactions_linked_transaction_id", table_name="transactions")
    op.drop_index("ix_transactions_account_id", table_name="transactions")
    op.alter_column("transactions", "category_id", existing_type=UUID(as_uuid=True), nullable=False)
    op.drop_constraint("fk_transactions_linked", "transactions", type_="foreignkey")
    op.drop_column("transactions", "transfer_direction")
    op.drop_column("transactions", "is_transfer")
    op.drop_column("transactions", "linked_transaction_id")
    op.drop_constraint("fk_transactions_account", "transactions", type_="foreignkey")
    op.drop_column("transactions", "account_id")
    op.drop_constraint("fk_users_default_account", "users", type_="foreignkey")
    op.drop_column("users", "default_account_id")
    op.drop_index("ix_accounts_user_id", table_name="accounts")
    op.drop_table("accounts")
