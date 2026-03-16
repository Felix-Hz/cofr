"""Exchange rate endpoint + conversion logic tests."""

from datetime import UTC, datetime

from app.db.models import ExchangeRate
from app.services.exchange_rates import convert


def test_get_rates_endpoint(client, auth_headers, db_session):
    headers, _ = auth_headers
    # Seed rates
    now = datetime.now(UTC)
    db_session.add(ExchangeRate(currency_code="NZD", rate_to_usd=1.6, updated_at=now))
    db_session.add(ExchangeRate(currency_code="USD", rate_to_usd=1.0, updated_at=now))
    db_session.commit()

    resp = client.get("/exchange-rates/", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "rates" in body
    assert body["rates"]["NZD"] == 1.6
    assert body["rates"]["USD"] == 1.0
    assert body["updated_at"] is not None


def test_convert_same_currency():
    rates = {"NZD": 1.6, "USD": 1.0}
    assert convert(100.0, "NZD", "NZD", rates) == 100.0


def test_convert_via_usd():
    rates = {"NZD": 1.6, "EUR": 0.9, "USD": 1.0}
    # 100 NZD -> USD = 100/1.6 = 62.5 -> EUR = 62.5 * 0.9 = 56.25
    result = convert(100.0, "NZD", "EUR", rates)
    assert abs(result - 56.25) < 0.01
