"""Lifetime + sparkline stats tests."""

from datetime import datetime, timedelta


def test_lifetime_stats_empty(client, auth_headers):
    headers, _ = auth_headers
    # Provision system accounts
    client.get("/accounts/", headers=headers)

    resp = client.get("/expenses/stats/lifetime?currency=NZD", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["net_worth"] == 0
    assert body["savings_balance"] == 0
    assert body["investment_balance"] == 0
    assert body["checking_balance"] == 0
    assert body["lifetime_income"] == 0
    assert body["lifetime_spent"] == 0
    assert body["currency"] == "NZD"


def test_lifetime_stats_aggregates(client, auth_headers, system_categories):
    headers, _ = auth_headers
    accts = client.get("/accounts/", headers=headers).json()
    checking = next(a["id"] for a in accts if a["name"] == "Checking")
    savings = next(a["id"] for a in accts if a["name"] == "Savings")
    salary = str(system_categories["salary"].id)
    food = str(system_categories["food"].id)

    # Income to checking
    client.post(
        "/expenses/",
        json={"amount": 2000, "category_id": salary, "currency": "NZD", "account_id": checking},
        headers=headers,
    )
    # Spend from checking
    client.post(
        "/expenses/",
        json={"amount": 150, "category_id": food, "currency": "NZD", "account_id": checking},
        headers=headers,
    )
    # Transfer 500 checking -> savings
    client.post(
        "/transfers/",
        json={
            "amount": 500,
            "from_account_id": checking,
            "to_account_id": savings,
            "currency": "NZD",
        },
        headers=headers,
    )

    body = client.get("/expenses/stats/lifetime?currency=NZD", headers=headers).json()
    assert body["checking_balance"] == 1350  # 2000 - 150 - 500
    assert body["savings_balance"] == 500
    assert body["net_worth"] == 1850
    assert body["lifetime_income"] == 2000
    assert body["lifetime_spent"] == 150


def test_sparkline_daily_buckets(client, auth_headers, system_categories):
    headers, _ = auth_headers
    accts = client.get("/accounts/", headers=headers).json()
    checking = next(a["id"] for a in accts if a["name"] == "Checking")
    food = str(system_categories["food"].id)

    day1 = datetime(2026, 3, 1, 10, 0, 0)
    day2 = datetime(2026, 3, 2, 10, 0, 0)

    client.post(
        "/expenses/",
        json={
            "amount": 10,
            "category_id": food,
            "currency": "NZD",
            "account_id": checking,
            "created_at": day1.isoformat(),
        },
        headers=headers,
    )
    client.post(
        "/expenses/",
        json={
            "amount": 20,
            "category_id": food,
            "currency": "NZD",
            "account_id": checking,
            "created_at": day1.isoformat(),
        },
        headers=headers,
    )
    client.post(
        "/expenses/",
        json={
            "amount": 5,
            "category_id": food,
            "currency": "NZD",
            "account_id": checking,
            "created_at": day2.isoformat(),
        },
        headers=headers,
    )

    start = (day1 - timedelta(hours=1)).isoformat()
    end = (day2 + timedelta(hours=1)).isoformat()
    resp = client.get(
        f"/expenses/stats/sparkline?start_date={start}&end_date={end}&currency=NZD",
        headers=headers,
    )
    assert resp.status_code == 200
    points = resp.json()["points"]
    assert len(points) == 2
    totals = {p["date"]: p["total"] for p in points}
    assert totals["2026-03-01"] == 30
    assert totals["2026-03-02"] == 5


def test_account_balances_currency_filter(client, auth_headers, system_categories):
    headers, _ = auth_headers
    accts = client.get("/accounts/", headers=headers).json()
    checking = next(a["id"] for a in accts if a["name"] == "Checking")
    salary = str(system_categories["salary"].id)

    client.post(
        "/expenses/",
        json={"amount": 1000, "category_id": salary, "currency": "NZD", "account_id": checking},
        headers=headers,
    )
    client.post(
        "/expenses/",
        json={"amount": 500, "category_id": salary, "currency": "USD", "account_id": checking},
        headers=headers,
    )

    nzd = client.get("/accounts/balances?currency=NZD", headers=headers).json()
    checking_nzd = next(b for b in nzd if b["account_id"] == checking)
    assert checking_nzd["balance"] == 1000

    usd = client.get("/accounts/balances?currency=USD", headers=headers).json()
    checking_usd = next(b for b in usd if b["account_id"] == checking)
    assert checking_usd["balance"] == 500
