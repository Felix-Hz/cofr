"""Tests for the analytics endpoints backing composable dashboard widgets."""

from datetime import UTC, datetime, timedelta


def _create_expense(
    client,
    headers,
    category_id: str,
    amount: float = 10.0,
    *,
    currency: str = "NZD",
    description: str = "",
    merchant: str | None = None,
    created_at: datetime | None = None,
):
    body: dict = {
        "amount": amount,
        "category_id": category_id,
        "currency": currency,
        "description": description,
    }
    if merchant is not None:
        body["merchant"] = merchant
    if created_at is not None:
        body["created_at"] = created_at.isoformat()
    resp = client.post("/expenses/", json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Monthly trend ──


def test_monthly_trend_buckets_income_and_spend(client, auth_headers, system_categories):
    headers, _ = auth_headers
    food = str(system_categories["food"].id)
    salary = str(system_categories["salary"].id)
    now = datetime.now(UTC)

    _create_expense(client, headers, food, amount=40, created_at=now)
    _create_expense(client, headers, food, amount=20, created_at=now - timedelta(days=35))
    _create_expense(client, headers, salary, amount=2000, created_at=now)

    resp = client.get("/dashboard/monthly-trend?months=3", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["points"]) == 3
    assert body["currency"] == "NZD"

    current_key = f"{now.year:04d}-{now.month:02d}"
    current_point = next(p for p in body["points"] if p["month"] == current_key)
    assert current_point["spent"] == 40
    assert current_point["income"] == 2000


def test_monthly_trend_excludes_opening_balance(client, auth_headers, system_categories):
    headers, _ = auth_headers
    food = str(system_categories["food"].id)
    now = datetime.now(UTC)

    # Opening balance: should be excluded
    client.post(
        "/expenses/",
        json={
            "amount": 9999,
            "category_id": food,
            "currency": "NZD",
            "description": "OB",
            "is_opening_balance": True,
        },
        headers=headers,
    )
    _create_expense(client, headers, food, amount=15, created_at=now)

    body = client.get("/dashboard/monthly-trend?months=2", headers=headers).json()
    spent_total = sum(p["spent"] for p in body["points"])
    assert spent_total == 15


def test_monthly_trend_validates_range(client, auth_headers):
    headers, _ = auth_headers
    assert client.get("/dashboard/monthly-trend?months=0", headers=headers).status_code == 422
    assert client.get("/dashboard/monthly-trend?months=99", headers=headers).status_code == 422


# ── Weekday heatmap ──


def test_weekday_heatmap_returns_full_grid(client, auth_headers, system_categories):
    headers, _ = auth_headers
    food = str(system_categories["food"].id)
    now = datetime.now(UTC)
    _create_expense(client, headers, food, amount=12, created_at=now)

    resp = client.get("/dashboard/weekday-heatmap?weeks=4", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["weeks"] == 4
    assert len(body["cells"]) == 4 * 7  # week × weekday grid
    assert any(c["total"] > 0 for c in body["cells"])


def test_weekday_heatmap_excludes_income(client, auth_headers, system_categories):
    headers, _ = auth_headers
    salary = str(system_categories["salary"].id)
    now = datetime.now(UTC)
    _create_expense(client, headers, salary, amount=5000, created_at=now)

    body = client.get("/dashboard/weekday-heatmap?weeks=2", headers=headers).json()
    assert all(c["total"] == 0 for c in body["cells"])


# ── Account trend ──


def test_account_trend_returns_series_per_account(client, auth_headers, system_categories):
    headers, _ = auth_headers
    food = str(system_categories["food"].id)
    salary = str(system_categories["salary"].id)
    now = datetime.now(UTC)

    _create_expense(client, headers, salary, amount=1000, created_at=now - timedelta(days=5))
    _create_expense(client, headers, food, amount=200, created_at=now - timedelta(days=2))

    resp = client.get("/dashboard/account-trend?days=14", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["days"] == 14
    assert len(body["series"]) >= 1
    first = body["series"][0]
    assert len(first["points"]) == 14
    assert first["color"].startswith("#")
    # Final balance should reflect income - expense for the default account
    last_balance = first["points"][-1]["balance"]
    assert last_balance == 800.0


def test_account_trend_validates_range(client, auth_headers):
    headers, _ = auth_headers
    assert client.get("/dashboard/account-trend?days=1", headers=headers).status_code == 422
    assert client.get("/dashboard/account-trend?days=999", headers=headers).status_code == 422


# ── Recurring detection ──


def test_recurring_detects_monthly_charge(client, auth_headers, system_categories):
    headers, _ = auth_headers
    food = str(system_categories["food"].id)
    now = datetime.now(UTC)

    for offset in (0, 30, 60):
        _create_expense(
            client,
            headers,
            food,
            amount=12.99,
            merchant="Netflix",
            created_at=now - timedelta(days=offset),
        )

    body = client.get("/dashboard/recurring", headers=headers).json()
    assert len(body["charges"]) == 1
    charge = body["charges"][0]
    assert charge["merchant"] == "Netflix"
    assert charge["occurrences"] == 3
    assert 25 <= charge["cadence_days"] <= 35
    assert charge["next_expected"] is not None


def test_recurring_ignores_one_off(client, auth_headers, system_categories):
    headers, _ = auth_headers
    food = str(system_categories["food"].id)
    now = datetime.now(UTC)

    _create_expense(client, headers, food, amount=4.5, merchant="Coffee", created_at=now)
    _create_expense(
        client,
        headers,
        food,
        amount=4.5,
        merchant="Coffee",
        created_at=now - timedelta(days=1),
    )

    body = client.get("/dashboard/recurring", headers=headers).json()
    assert body["charges"] == []


def test_recurring_skips_transactions_without_merchant(client, auth_headers, system_categories):
    headers, _ = auth_headers
    food = str(system_categories["food"].id)
    now = datetime.now(UTC)

    for offset in (0, 30, 60):
        _create_expense(client, headers, food, amount=10, created_at=now - timedelta(days=offset))

    body = client.get("/dashboard/recurring", headers=headers).json()
    assert body["charges"] == []


# ── Auth ──


def test_analytics_endpoints_require_auth(client):
    for path in (
        "/dashboard/monthly-trend",
        "/dashboard/weekday-heatmap",
        "/dashboard/account-trend",
        "/dashboard/recurring",
    ):
        resp = client.get(path)
        assert resp.status_code == 401
