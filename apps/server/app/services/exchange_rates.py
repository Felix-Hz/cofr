import logging
from datetime import UTC, datetime

import httpx
from sqlalchemy.orm import Session

from app.db.models import ExchangeRate

logger = logging.getLogger(__name__)

SUPPORTED_CURRENCIES = ["NZD", "EUR", "USD", "GBP", "AUD", "BRL", "ARS", "COP", "JPY"]

FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=USD"


def get_rates_from_db(db: Session) -> dict[str, float]:
    """Return {currency_code: rate_to_usd} from the DB."""
    rows = db.query(ExchangeRate).all()
    return {r.currency_code: r.rate_to_usd for r in rows}


def get_rates_metadata(db: Session) -> dict:
    """Return rates + updated_at for API response."""
    rows = db.query(ExchangeRate).all()
    if not rows:
        return {"rates": {}, "updated_at": None}
    return {
        "rates": {r.currency_code: r.rate_to_usd for r in rows},
        "updated_at": min(r.updated_at for r in rows).isoformat(),
    }


def convert(amount: float, from_currency: str, to_currency: str, rates: dict[str, float]) -> float:
    """Convert amount between currencies via USD intermediary."""
    if from_currency == to_currency:
        return amount
    from_rate = rates.get(from_currency, 1.0)
    to_rate = rates.get(to_currency, 1.0)
    # amount in from_currency -> USD -> to_currency
    usd_amount = amount / from_rate
    return usd_amount * to_rate


def refresh_rates_in_db(db: Session) -> bool:
    """Fetch latest rates from frankfurter.app and upsert into DB.

    Returns True on success, False on failure (DB keeps last known values).
    """
    try:
        resp = httpx.get(FRANKFURTER_URL, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        api_rates: dict[str, float] = data.get("rates", {})
        api_rates["USD"] = 1.0  # frankfurter omits the base currency

        now = datetime.now(UTC)
        for code in SUPPORTED_CURRENCIES:
            rate = api_rates.get(code)
            if rate is None:
                continue
            existing = db.query(ExchangeRate).filter(ExchangeRate.currency_code == code).first()
            if existing:
                existing.rate_to_usd = rate
                existing.updated_at = now
            else:
                db.add(ExchangeRate(currency_code=code, rate_to_usd=rate, updated_at=now))

        db.commit()
        logger.info("Exchange rates refreshed successfully")
        return True
    except Exception:
        db.rollback()
        logger.exception("Failed to refresh exchange rates — keeping last known values")
        return False
