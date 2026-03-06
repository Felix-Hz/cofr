"""exchange_rates

Revision ID: 002
Revises: 001
Create Date: 2026-03-05

Add exchange_rates table with seed data for supported currencies.
"""

from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

revision: str = "002"
down_revision: str = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Approximate rates as of 2026-03-05 (1 USD = X of this currency)
SEED_RATES = {
    "USD": 1.0,
    "NZD": 1.72,
    "EUR": 0.92,
    "GBP": 0.79,
    "AUD": 1.55,
    "BRL": 5.80,
    "ARS": 1050.0,
    "COP": 4150.0,
    "JPY": 150.0,
}


def upgrade() -> None:
    table = op.create_table(
        "exchange_rates",
        sa.Column("currency_code", sa.String(), primary_key=True),
        sa.Column("rate_to_usd", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    now = datetime.now(UTC)
    op.bulk_insert(
        table,
        [
            {"currency_code": code, "rate_to_usd": rate, "updated_at": now}
            for code, rate in SEED_RATES.items()
        ],
    )


def downgrade() -> None:
    op.drop_table("exchange_rates")
