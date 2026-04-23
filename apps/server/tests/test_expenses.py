"""Expense CRUD + stats tests."""


# ── Helpers ──


def _create_expense(
    client,
    headers,
    category_id,
    amount=10.0,
    currency="NZD",
    description="",
    account_id=None,
    is_opening_balance=False,
    created_at=None,
):
    body = {
        "amount": amount,
        "category_id": category_id,
        "currency": currency,
        "description": description,
        "is_opening_balance": is_opening_balance,
    }
    if account_id:
        body["account_id"] = account_id
    if created_at:
        body["created_at"] = created_at
    resp = client.post("/expenses/", json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


# ── Create ──


def test_create_expense_success(client, auth_headers, system_categories):
    headers, _ = auth_headers
    cat_id = str(system_categories["food"].id)
    data = _create_expense(client, headers, cat_id, amount=25.50, description="Lunch")
    assert data["amount"] == 25.50
    assert data["category_id"] == cat_id
    assert data["description"] == "Lunch"


def test_create_expense_uses_default_account(client, auth_headers, system_categories):
    headers, _ = auth_headers
    cat_id = str(system_categories["food"].id)
    data = _create_expense(client, headers, cat_id)
    assert data["account_id"]  # should have been assigned


def test_create_expense_opening_balance(client, auth_headers, system_categories):
    headers, _ = auth_headers
    cat_id = str(system_categories["miscellaneous"].id)
    data = _create_expense(client, headers, cat_id, is_opening_balance=True)
    assert data["is_opening_balance"] is True


def test_create_expense_description_max_length(client, auth_headers, system_categories):
    headers, _ = auth_headers
    cat_id = str(system_categories["food"].id)
    resp = client.post(
        "/expenses/",
        json={"amount": 1, "category_id": cat_id, "description": "x" * 361, "currency": "NZD"},
        headers=headers,
    )
    assert resp.status_code == 422


def test_create_expense_with_merchant(client, auth_headers, system_categories):
    headers, _ = auth_headers
    cat_id = str(system_categories["food"].id)
    resp = client.post(
        "/expenses/",
        json={
            "amount": 12.5,
            "category_id": cat_id,
            "currency": "NZD",
            "description": "Lunch",
            "merchant": "Daily Bread",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["merchant"] == "Daily Bread"


def test_create_expense_merchant_max_length(client, auth_headers, system_categories):
    headers, _ = auth_headers
    cat_id = str(system_categories["food"].id)
    resp = client.post(
        "/expenses/",
        json={
            "amount": 1,
            "category_id": cat_id,
            "currency": "NZD",
            "merchant": "x" * 121,
        },
        headers=headers,
    )
    assert resp.status_code == 422


def test_update_expense_clears_merchant(client, auth_headers, system_categories):
    headers, _ = auth_headers
    cat_id = str(system_categories["food"].id)
    created = _create_expense(client, headers, cat_id)
    # Set then clear via empty string
    client.put(
        f"/expenses/{created['id']}",
        json={"merchant": "Spotify"},
        headers=headers,
    )
    resp = client.put(
        f"/expenses/{created['id']}",
        json={"merchant": ""},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["merchant"] is None


# ── Read ──


def test_get_expenses_empty(client, auth_headers):
    headers, _ = auth_headers
    resp = client.get("/expenses/", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["expenses"] == []
    assert resp.json()["total_count"] == 0


def test_get_expenses_cross_user_isolation(client, auth_headers, second_auth, system_categories):
    h1, _ = auth_headers
    h2, _ = second_auth
    cat_id = str(system_categories["food"].id)

    _create_expense(client, h1, cat_id, description="User1 only")

    resp = client.get("/expenses/", headers=h2)
    assert resp.status_code == 200
    assert resp.json()["total_count"] == 0


def test_get_expense_by_id(client, auth_headers, system_categories):
    headers, _ = auth_headers
    cat_id = str(system_categories["food"].id)
    created = _create_expense(client, headers, cat_id, description="Find me")
    resp = client.get(f"/expenses/{created['id']}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["description"] == "Find me"


def test_get_expense_other_user_404(client, auth_headers, second_auth, system_categories):
    h1, _ = auth_headers
    h2, _ = second_auth
    cat_id = str(system_categories["food"].id)
    created = _create_expense(client, h1, cat_id)

    resp = client.get(f"/expenses/{created['id']}", headers=h2)
    assert resp.status_code == 404


def test_get_expenses_pagination(client, auth_headers, system_categories):
    headers, _ = auth_headers
    cat_id = str(system_categories["food"].id)
    for i in range(5):
        _create_expense(client, headers, cat_id, description=f"item {i}")

    resp = client.get("/expenses/?limit=2&offset=0", headers=headers)
    body = resp.json()
    assert len(body["expenses"]) == 2
    assert body["total_count"] == 5

    resp2 = client.get("/expenses/?limit=2&offset=2", headers=headers)
    assert len(resp2.json()["expenses"]) == 2


def test_get_expenses_can_collapse_transfer_pairs(client, auth_headers):
    headers, _ = auth_headers
    accounts_resp = client.get("/accounts/", headers=headers)
    assert accounts_resp.status_code == 200
    accounts = accounts_resp.json()

    transfer_resp = client.post(
        "/transfers/",
        json={
            "amount": 125,
            "from_account_id": accounts[0]["id"],
            "to_account_id": accounts[1]["id"],
            "currency": "NZD",
        },
        headers=headers,
    )
    assert transfer_resp.status_code == 201

    resp = client.get("/expenses/?collapse_transfer_pairs=true", headers=headers)
    assert resp.status_code == 200
    body = resp.json()

    assert body["total_count"] == 1
    assert len(body["expenses"]) == 1
    assert body["expenses"][0]["transfer_direction"] == "from"
    assert body["expenses"][0]["linked_account_name"] == accounts[1]["name"]


# ── Update ──


def test_update_expense_partial(client, auth_headers, system_categories):
    headers, _ = auth_headers
    cat_id = str(system_categories["food"].id)
    created = _create_expense(client, headers, cat_id, amount=10)

    resp = client.put(
        f"/expenses/{created['id']}",
        json={"amount": 99.99},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["amount"] == 99.99
    assert resp.json()["category_id"] == cat_id  # unchanged


def test_update_expense_other_user_404(client, auth_headers, second_auth, system_categories):
    h1, _ = auth_headers
    h2, _ = second_auth
    cat_id = str(system_categories["food"].id)
    created = _create_expense(client, h1, cat_id)

    resp = client.put(f"/expenses/{created['id']}", json={"amount": 1}, headers=h2)
    assert resp.status_code == 404


# ── Delete ──


def test_delete_expense_success(client, auth_headers, system_categories):
    headers, _ = auth_headers
    cat_id = str(system_categories["food"].id)
    created = _create_expense(client, headers, cat_id)

    resp = client.delete(f"/expenses/{created['id']}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    resp2 = client.get(f"/expenses/{created['id']}", headers=headers)
    assert resp2.status_code == 404


def test_delete_expense_other_user_404(client, auth_headers, second_auth, system_categories):
    h1, _ = auth_headers
    h2, _ = second_auth
    cat_id = str(system_categories["food"].id)
    created = _create_expense(client, h1, cat_id)

    resp = client.delete(f"/expenses/{created['id']}", headers=h2)
    assert resp.status_code == 404


# ── Stats (range, SQLite-compatible) ──


def test_range_stats_basic(client, auth_headers, system_categories):
    headers, _ = auth_headers
    food_id = str(system_categories["food"].id)
    salary_id = str(system_categories["salary"].id)

    ts = "2024-06-15T12:00:00"
    _create_expense(client, headers, food_id, amount=50, created_at=ts)
    _create_expense(client, headers, salary_id, amount=200, created_at=ts)

    resp = client.get(
        "/expenses/stats/range?start_date=2024-06-01T00:00:00&end_date=2024-06-30T23:59:59&currency=NZD",
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_spent"] == 50
    assert body["total_income"] == 200
    assert body["transaction_count"] == 2


def test_range_stats_excludes_opening_balances(client, auth_headers, system_categories):
    headers, _ = auth_headers
    food_id = str(system_categories["food"].id)
    ts = "2024-06-15T12:00:00"

    _create_expense(client, headers, food_id, amount=100, created_at=ts, is_opening_balance=True)
    _create_expense(client, headers, food_id, amount=30, created_at=ts)

    resp = client.get(
        "/expenses/stats/range?start_date=2024-06-01T00:00:00&end_date=2024-06-30T23:59:59&currency=NZD",
        headers=headers,
    )
    body = resp.json()
    assert body["total_spent"] == 30  # opening balance excluded


def test_range_stats_excludes_transfers(client, auth_headers, system_categories):
    headers, _ = auth_headers
    food_id = str(system_categories["food"].id)
    ts = "2024-06-15T12:00:00"

    _create_expense(client, headers, food_id, amount=40, created_at=ts)

    # Create a transfer via the transfer endpoint
    accounts_resp = client.get("/accounts/", headers=headers)
    accts = accounts_resp.json()
    if len(accts) >= 2:
        client.post(
            "/transfers/",
            json={
                "amount": 500,
                "from_account_id": accts[0]["id"],
                "to_account_id": accts[1]["id"],
                "currency": "NZD",
                "created_at": ts,
            },
            headers=headers,
        )

    resp = client.get(
        "/expenses/stats/range?start_date=2024-06-01T00:00:00&end_date=2024-06-30T23:59:59&currency=NZD",
        headers=headers,
    )
    body = resp.json()
    assert body["total_spent"] == 40  # transfer excluded


# ── Savings Net Change ──


def test_savings_net_change_zero_no_savings_transactions(client, auth_headers, system_categories):
    """savings_net_change is 0 when no transactions touch savings/investment accounts."""
    headers, _ = auth_headers
    food_id = str(system_categories["food"].id)
    ts = "2024-06-15T12:00:00"
    _create_expense(client, headers, food_id, amount=50, created_at=ts)

    resp = client.get(
        "/expenses/stats/range?start_date=2024-06-01T00:00:00&end_date=2024-06-30T23:59:59&currency=NZD",
        headers=headers,
    )
    body = resp.json()
    assert body["savings_net_change"] == 0


def test_savings_net_change_transfer_to_savings(client, auth_headers, system_categories):
    """Transfer from checking to savings shows up as positive savings_net_change."""
    headers, _ = auth_headers
    ts = "2024-06-15T12:00:00"

    accts = client.get("/accounts/", headers=headers).json()
    checking_id = next(a["id"] for a in accts if a["name"] == "Checking")
    savings_id = next(a["id"] for a in accts if a["name"] == "Savings")

    client.post(
        "/transfers/",
        json={
            "amount": 300,
            "from_account_id": checking_id,
            "to_account_id": savings_id,
            "currency": "NZD",
            "created_at": ts,
        },
        headers=headers,
    )

    resp = client.get(
        "/expenses/stats/range?start_date=2024-06-01T00:00:00&end_date=2024-06-30T23:59:59&currency=NZD",
        headers=headers,
    )
    body = resp.json()
    # +300 to savings, -300 from checking (not savings type) = net +300
    assert body["savings_net_change"] == 300


def test_savings_net_change_income_to_savings(client, auth_headers, system_categories):
    """Income deposited directly into a savings account counts as savings."""
    headers, _ = auth_headers
    salary_id = str(system_categories["salary"].id)
    ts = "2024-06-15T12:00:00"

    accts = client.get("/accounts/", headers=headers).json()
    savings_id = next(a["id"] for a in accts if a["name"] == "Savings")

    _create_expense(client, headers, salary_id, amount=500, account_id=savings_id, created_at=ts)

    resp = client.get(
        "/expenses/stats/range?start_date=2024-06-01T00:00:00&end_date=2024-06-30T23:59:59&currency=NZD",
        headers=headers,
    )
    body = resp.json()
    assert body["savings_net_change"] == 500


def test_savings_net_change_expense_from_savings(client, auth_headers, system_categories):
    """Expense from a savings account reduces savings_net_change."""
    headers, _ = auth_headers
    food_id = str(system_categories["food"].id)
    ts = "2024-06-15T12:00:00"

    accts = client.get("/accounts/", headers=headers).json()
    savings_id = next(a["id"] for a in accts if a["name"] == "Savings")

    _create_expense(client, headers, food_id, amount=100, account_id=savings_id, created_at=ts)

    resp = client.get(
        "/expenses/stats/range?start_date=2024-06-01T00:00:00&end_date=2024-06-30T23:59:59&currency=NZD",
        headers=headers,
    )
    body = resp.json()
    assert body["savings_net_change"] == -100
