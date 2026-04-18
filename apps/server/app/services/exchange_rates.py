import logging
import threading
from datetime import UTC, datetime

import httpx
from sqlalchemy.orm import Session

from app.db.models import ExchangeRate

logger = logging.getLogger(__name__)

SUPPORTED_CURRENCIES = ["NZD", "EUR", "USD", "GBP", "AUD", "BRL", "ARS", "COP", "JPY"]

FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?from=USD"

_rates_cache: dict[str, float] | None = None
_rates_cache_updated_at: datetime | None = None
_rates_lock = threading.Lock()

CACHE_TTL_SECONDS = 86400  # 24 hours


def _get_cached_rates() -> dict[str, float] | None:
    global _rates_cache, _rates_cache_updated_at
    if _rates_cache and _rates_cache_updated_at:
        age = (datetime.now(UTC) - _rates_cache_updated_at).total_seconds()
        if age < CACHE_TTL_SECONDS:
            return _rates_cache
    return None


def _set_cached_rates(rates: dict[str, float]) -> None:
    global _rates_cache, _rates_cache_updated_at
    _rates_cache = rates
    _rates_cache_updated_at = datetime.now(UTC)


def get_rates_from_db(db: Session, use_cache: bool = True) -> dict[str, float]:
    """Return {currency_code: rate_to_usd} from the DB.

    Uses in-memory cache with 24h TTL to avoid repeated DB queries.
    """
    if use_cache:
        cached = _get_cached_rates()
        if cached is not None:
            return cached

    rows = db.query(ExchangeRate).all()
    rates = {r.currency_code: r.rate_to_usd for r in rows}

    if use_cache:
        with _rates_lock:
            _set_cached_rates(rates)

    return rates


def get_rates_metadata(db: Session, use_cache: bool = True) -> dict:
    """Return rates + updated_at for API response."""
    rates = get_rates_from_db(db, use_cache=use_cache)
    if not rates:
        return {"rates": {}, "updated_at": None}

    rows = db.query(ExchangeRate).all()
    min_updated = min((r.updated_at for r in rows), default=None)
    return {
        "rates": rates,
        "updated_at": min_updated.isoformat() if min_updated else None,
    }


def invalidate_cache() -> None:
    """Clear the in-memory rates cache (call after refresh)."""
    global _rates_cache, _rates_cache_updated_at
    with _rates_lock:
        _rates_cache = None
        _rates_cache_updated_at = None


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
        resp = httpx.get(FRANKFURTER_URL, timeout=10, follow_redirects=True)
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
        invalidate_cache()
        logger.info("Exchange rates refreshed successfully")
        return True
    except Exception:
        db.rollback()
        logger.exception("Failed to refresh exchange rates — keeping last known values")
        return False
