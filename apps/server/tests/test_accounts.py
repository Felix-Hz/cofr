"""Financial accounts CRUD + balance tests."""


def _get_accounts(client, headers):
    resp = client.get("/accounts/", headers=headers)
    assert resp.status_code == 200
    return resp.json()


def test_get_accounts_provisions_system_accounts(client, auth_headers):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    assert len(accts) == 3
    names = {a["name"] for a in accts}
    assert names == {"Checking", "Savings", "Investment"}
    assert all(a["is_system"] for a in accts)


def test_get_accounts_idempotent(client, auth_headers):
    headers, _ = auth_headers
    first = _get_accounts(client, headers)
    second = _get_accounts(client, headers)
    assert [a["id"] for a in first] == [a["id"] for a in second]


def test_create_custom_account(client, auth_headers):
    headers, _ = auth_headers
    resp = client.post(
        "/accounts/",
        json={"name": "Cash", "type": "checking"},
        headers=headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Cash"
    assert body["is_system"] is False


def test_create_duplicate_name_409(client, auth_headers):
    headers, _ = auth_headers
    client.post("/accounts/", json={"name": "Cash", "type": "checking"}, headers=headers)
    resp = client.post("/accounts/", json={"name": "Cash", "type": "checking"}, headers=headers)
    assert resp.status_code == 409


def test_delete_custom_account(client, auth_headers):
    headers, _ = auth_headers
    create_resp = client.post(
        "/accounts/",
        json={"name": "Temp", "type": "checking"},
        headers=headers,
    )
    acct_id = create_resp.json()["id"]

    del_resp = client.delete(f"/accounts/{acct_id}", headers=headers)
    assert del_resp.status_code == 200


def test_delete_system_account_rejected(client, auth_headers):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    system_id = next(a["id"] for a in accts if a["is_system"])
    resp = client.delete(f"/accounts/{system_id}", headers=headers)
    assert resp.status_code == 403


def test_delete_account_with_transactions_rejected(client, auth_headers, system_categories):
    headers, _ = auth_headers
    # Create a custom account and add a transaction to it
    acct_resp = client.post(
        "/accounts/", json={"name": "Busy", "type": "checking"}, headers=headers
    )
    acct_id = acct_resp.json()["id"]
    cat_id = str(system_categories["food"].id)

    client.post(
        "/expenses/",
        json={"amount": 10, "category_id": cat_id, "currency": "NZD", "account_id": acct_id},
        headers=headers,
    )

    resp = client.delete(f"/accounts/{acct_id}", headers=headers)
    assert resp.status_code == 400


def test_move_transactions_success(client, auth_headers, system_categories):
    headers, _ = auth_headers
    # Create source account with transactions
    src_resp = client.post(
        "/accounts/", json={"name": "Source", "type": "checking"}, headers=headers
    )
    src_id = src_resp.json()["id"]
    cat_id = str(system_categories["food"].id)

    client.post(
        "/expenses/",
        json={"amount": 10, "category_id": cat_id, "currency": "NZD", "account_id": src_id},
        headers=headers,
    )
    client.post(
        "/expenses/",
        json={"amount": 20, "category_id": cat_id, "currency": "NZD", "account_id": src_id},
        headers=headers,
    )

    # Get a target account
    accts = _get_accounts(client, headers)
    target_id = next(a["id"] for a in accts if a["name"] == "Checking")

    resp = client.post(
        f"/accounts/{src_id}/move-transactions",
        json={"target_account_id": target_id},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["moved_count"] == 2

    # Source should now be deletable
    del_resp = client.delete(f"/accounts/{src_id}", headers=headers)
    assert del_resp.status_code == 200


def test_move_transactions_same_account(client, auth_headers):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    acct_id = accts[0]["id"]

    resp = client.post(
        f"/accounts/{acct_id}/move-transactions",
        json={"target_account_id": acct_id},
        headers=headers,
    )
    assert resp.status_code == 400


def test_move_transactions_target_not_found(client, auth_headers):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    acct_id = accts[0]["id"]

    resp = client.post(
        f"/accounts/{acct_id}/move-transactions",
        json={"target_account_id": "00000000-0000-0000-0000-000000000000"},
        headers=headers,
    )
    assert resp.status_code == 404


def test_account_balances_income_expense(client, auth_headers, system_categories):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    checking_id = next(a["id"] for a in accts if a["name"] == "Checking")
    food_id = str(system_categories["food"].id)
    salary_id = str(system_categories["salary"].id)

    # Add income and expense to checking
    client.post(
        "/expenses/",
        json={
            "amount": 500,
            "category_id": salary_id,
            "currency": "NZD",
            "account_id": checking_id,
        },
        headers=headers,
    )
    client.post(
        "/expenses/",
        json={"amount": 100, "category_id": food_id, "currency": "NZD", "account_id": checking_id},
        headers=headers,
    )

    balances = client.get("/accounts/balances", headers=headers).json()
    checking_bal = next(b for b in balances if b["account_id"] == checking_id)
    assert checking_bal["balance"] == 400  # +500 income - 100 expense


def test_account_balances_with_transfers(client, auth_headers):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    from_id = accts[0]["id"]
    to_id = accts[1]["id"]

    client.post(
        "/transfers/",
        json={"amount": 200, "from_account_id": from_id, "to_account_id": to_id, "currency": "NZD"},
        headers=headers,
    )

    balances = client.get("/accounts/balances", headers=headers).json()
    bal_map = {b["account_id"]: b["balance"] for b in balances}
    assert bal_map[from_id] == -200
    assert bal_map[to_id] == 200


def test_account_balances_includes_opening_balance(client, auth_headers, system_categories):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    checking_id = next(a["id"] for a in accts if a["name"] == "Checking")
    salary_id = str(system_categories["salary"].id)

    # Opening balance should count toward the account balance
    client.post(
        "/expenses/",
        json={
            "amount": 1000,
            "category_id": salary_id,
            "currency": "NZD",
            "account_id": checking_id,
            "is_opening_balance": True,
        },
        headers=headers,
    )

    balances = client.get("/accounts/balances", headers=headers).json()
    checking_bal = next(b for b in balances if b["account_id"] == checking_id)
    assert checking_bal["balance"] == 1000
