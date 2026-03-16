"""Transfer lifecycle + balance effect tests."""


def _get_accounts(client, headers):
    resp = client.get("/accounts/", headers=headers)
    assert resp.status_code == 200
    return resp.json()


def _create_transfer(client, headers, from_id, to_id, amount=100, currency="NZD", description=""):
    resp = client.post(
        "/transfers/",
        json={
            "amount": amount,
            "from_account_id": from_id,
            "to_account_id": to_id,
            "description": description,
            "currency": currency,
        },
        headers=headers,
    )
    return resp


def test_create_transfer_success(client, auth_headers):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    from_id, to_id = accts[0]["id"], accts[1]["id"]

    resp = _create_transfer(client, headers, from_id, to_id, amount=250)
    assert resp.status_code == 201
    body = resp.json()

    from_tx = body["from_transaction"]
    to_tx = body["to_transaction"]

    assert from_tx["is_transfer"] is True
    assert to_tx["is_transfer"] is True
    assert from_tx["transfer_direction"] == "from"
    assert to_tx["transfer_direction"] == "to"
    assert from_tx["category_id"] is None
    assert to_tx["category_id"] is None
    assert from_tx["amount"] == 250
    assert to_tx["amount"] == 250
    # Cross-reference linked IDs
    assert from_tx["linked_transaction_id"] == to_tx["id"]
    assert to_tx["linked_transaction_id"] == from_tx["id"]


def test_create_transfer_same_account_400(client, auth_headers):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    same_id = accts[0]["id"]

    resp = _create_transfer(client, headers, same_id, same_id)
    assert resp.status_code == 400


def test_create_transfer_other_users_account_404(client, auth_headers, second_auth):
    h1, _ = auth_headers
    h2, _ = second_auth
    accts1 = _get_accounts(client, h1)
    accts2 = _get_accounts(client, h2)

    # Try to transfer from user1's account to user2's account (using user1's auth)
    resp = _create_transfer(client, h1, accts1[0]["id"], accts2[0]["id"])
    assert resp.status_code == 404


def test_update_transfer_updates_both_sides(client, auth_headers):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    from_id, to_id = accts[0]["id"], accts[1]["id"]

    create_resp = _create_transfer(client, headers, from_id, to_id, amount=100)
    assert create_resp.status_code == 201
    tx_id = create_resp.json()["from_transaction"]["id"]

    update_resp = client.put(
        f"/transfers/{tx_id}",
        json={
            "amount": 200,
            "from_account_id": from_id,
            "to_account_id": to_id,
            "currency": "NZD",
        },
        headers=headers,
    )
    assert update_resp.status_code == 200
    body = update_resp.json()
    assert body["from_transaction"]["amount"] == 200
    assert body["to_transaction"]["amount"] == 200


def test_delete_transfer_deletes_both_sides(client, auth_headers):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    from_id, to_id = accts[0]["id"], accts[1]["id"]

    create_resp = _create_transfer(client, headers, from_id, to_id, amount=50)
    assert create_resp.status_code == 201
    from_tx_id = create_resp.json()["from_transaction"]["id"]
    to_tx_id = create_resp.json()["to_transaction"]["id"]

    del_resp = client.delete(f"/transfers/{from_tx_id}", headers=headers)
    assert del_resp.status_code == 200

    # Both sides should be gone
    assert client.get(f"/expenses/{from_tx_id}", headers=headers).status_code == 404
    assert client.get(f"/expenses/{to_tx_id}", headers=headers).status_code == 404


def test_transfer_balance_effect(client, auth_headers, system_categories):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    from_id, to_id = accts[0]["id"], accts[1]["id"]

    _create_transfer(client, headers, from_id, to_id, amount=300)

    balances_resp = client.get("/accounts/balances", headers=headers)
    assert balances_resp.status_code == 200
    balances = {b["account_id"]: b["balance"] for b in balances_resp.json()}
    assert balances[from_id] == -300
    assert balances[to_id] == 300
