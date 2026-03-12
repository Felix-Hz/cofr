"""categories

Revision ID: 005
Revises: 004
Create Date: 2026-03-12

Add categories table, user_category_preferences table,
replace transactions.category string with category_id FK,
seed 11 system categories.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "005"
down_revision: str = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SYSTEM_CATEGORIES = [
    ("Income", "income", "income", "$", 0, "#22c55e", "#4ade80"),
    ("Savings", "savings", "savings", "S", 1, "#10b981", "#34d399"),
    ("Investment", "investment", "investment", "INV", 2, "#a3e635", "#bef264"),
    ("Housing", "housing", "expense", "H", 3, "#6366f1", "#818cf8"),
    ("Bills & Utilities", "bills-utilities", "expense", "B", 4, "#eab308", "#facc15"),
    ("Food & Dining", "food-dining", "expense", "F", 5, "#f97316", "#fb923c"),
    ("Transport", "transport", "expense", "T", 6, "#0284c7", "#38bdf8"),
    ("Travel", "travel", "expense", "TR", 7, "#0ea5e9", "#7dd3fc"),
    ("Health & Wellness", "health-wellness", "expense", "HW", 8, "#ef4444", "#f87171"),
    ("Lifestyle", "lifestyle", "expense", "L", 9, "#a855f7", "#c084fc"),
    ("Miscellaneous", "miscellaneous", "expense", "M", 10, "#6b7280", "#9ca3af"),
]

# Map old category names → new system category slugs for backfill
OLD_TO_NEW_SLUG = {
    "Income": "income",
    "Savings": "savings",
    "Investment": "investment",
    "Utilities": "bills-utilities",
    "Subscriptions": "bills-utilities",
    "Rent": "housing",
    "Health & Fitness": "health-wellness",
    "Transport": "transport",
    "Groceries": "food-dining",
    "Going Out": "lifestyle",
    "Shopping": "lifestyle",
    "Education": "lifestyle",
    "Travel": "travel",
    "Entertainment": "lifestyle",
    "Miscellaneous": "miscellaneous",
}


def upgrade() -> None:
    # 1. Create categories table
    op.create_table(
        "categories",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(60), nullable=False),
        sa.Column("slug", sa.String(60), nullable=False),
        sa.Column("color_light", sa.String(7), nullable=False),
        sa.Column("color_dark", sa.String(7), nullable=False),
        sa.Column("icon", sa.String(30), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("type", sa.String(10), nullable=False, server_default=sa.text("'expense'")),
        sa.Column("alias", sa.String(10), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "slug", name="uq_category_user_slug"),
    )

    # Partial unique index for system categories (NULL user_id)
    op.execute(
        "CREATE UNIQUE INDEX uq_system_category_slug ON categories(slug) WHERE user_id IS NULL"
    )

    # 2. Create user_category_preferences table
    op.create_table(
        "user_category_preferences",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("user_id", "category_id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"),
    )

    # 3. Seed system categories
    for name, slug, cat_type, alias, order, color_light, color_dark in SYSTEM_CATEGORIES:
        op.execute(
            sa.text(
                "INSERT INTO categories (name, slug, type, alias, display_order, "
                "color_light, color_dark, is_system, is_active, user_id) "
                "VALUES (:name, :slug, :type, :alias, :display_order, "
                ":color_light, :color_dark, true, true, NULL)"
            ).bindparams(
                name=name,
                slug=slug,
                type=cat_type,
                alias=alias,
                display_order=order,
                color_light=color_light,
                color_dark=color_dark,
            )
        )

    # 4. Add category_id column to transactions (nullable first for backfill)
    op.add_column("transactions", sa.Column("category_id", sa.Uuid(), nullable=True))

    # 5. Backfill: map old category names to new category IDs
    for old_name, new_slug in OLD_TO_NEW_SLUG.items():
        op.execute(
            sa.text(
                "UPDATE transactions SET category_id = "
                "(SELECT id FROM categories WHERE slug = :slug AND user_id IS NULL) "
                "WHERE category = :old_name AND category_id IS NULL"
            ).bindparams(slug=new_slug, old_name=old_name)
        )

    # Catch-all: any unmapped categories → Miscellaneous
    op.execute(
        sa.text(
            "UPDATE transactions SET category_id = "
            "(SELECT id FROM categories WHERE slug = 'miscellaneous' AND user_id IS NULL) "
            "WHERE category_id IS NULL"
        )
    )

    # 6. Make category_id NOT NULL, add FK and index
    op.alter_column("transactions", "category_id", nullable=False)
    op.create_foreign_key(
        "fk_transactions_category_id", "transactions", "categories", ["category_id"], ["id"]
    )
    op.create_index("ix_transactions_category_id", "transactions", ["category_id"])

    # 7. Drop old category column and its index
    op.drop_index("ix_transactions_category", table_name="transactions")
    op.drop_column("transactions", "category")


def downgrade() -> None:
    # Re-add old category string column
    op.add_column("transactions", sa.Column("category", sa.String(), nullable=True))

    # Backfill from category_id → name
    op.execute(
        sa.text(
            "UPDATE transactions SET category = "
            "(SELECT name FROM categories WHERE id = transactions.category_id)"
        )
    )
    op.alter_column("transactions", "category", nullable=False)
    op.create_index("ix_transactions_category", "transactions", ["category"])

    # Drop category_id FK and column
    op.drop_index("ix_transactions_category_id", table_name="transactions")
    op.drop_constraint("fk_transactions_category_id", "transactions", type_="foreignkey")
    op.drop_column("transactions", "category_id")

    op.drop_table("user_category_preferences")
    op.execute("DROP INDEX IF EXISTS uq_system_category_slug")
    op.drop_table("categories")
