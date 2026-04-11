"""Dashboard layout tests."""


def test_get_layout_lazy_creates_default(client, auth_headers):
    headers, _ = auth_headers
    resp = client.get("/dashboard/layout", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["spaces"]) == 1

    space = body["spaces"][0]
    assert space["name"] == "Overview"
    assert space["is_default"] is True
    assert space["position"] == 0

    widget_types = [w["widget_type"] for w in space["widgets"]]
    assert "period_stats_4up" in widget_types
    assert "transactions" in widget_types
    assert "net_worth" in widget_types
    assert "account_balances" in widget_types


def test_get_layout_idempotent(client, auth_headers):
    headers, _ = auth_headers
    first = client.get("/dashboard/layout", headers=headers).json()
    second = client.get("/dashboard/layout", headers=headers).json()
    assert first == second


def test_update_layout_replaces_widgets(client, auth_headers):
    headers, _ = auth_headers
    client.get("/dashboard/layout", headers=headers)

    payload = {
        "spaces": [
            {
                "name": "Overview",
                "position": 0,
                "is_default": True,
                "widgets": [
                    {
                        "widget_type": "category_pie",
                        "col_x": 0,
                        "col_y": 0,
                        "col_span": 6,
                        "row_span": 2,
                    },
                    {
                        "widget_type": "transactions",
                        "col_x": 6,
                        "col_y": 0,
                        "col_span": 6,
                        "row_span": 2,
                    },
                ],
            }
        ]
    }
    resp = client.put("/dashboard/layout", json=payload, headers=headers)
    assert resp.status_code == 200
    space = resp.json()["spaces"][0]
    assert len(space["widgets"]) == 2
    assert {w["widget_type"] for w in space["widgets"]} == {"category_pie", "transactions"}


def test_update_layout_rejects_unknown_widget_type(client, auth_headers):
    headers, _ = auth_headers
    payload = {
        "spaces": [
            {
                "name": "Overview",
                "position": 0,
                "is_default": True,
                "widgets": [
                    {
                        "widget_type": "crypto_portfolio",
                        "col_x": 0,
                        "col_y": 0,
                        "col_span": 6,
                        "row_span": 2,
                    }
                ],
            }
        ]
    }
    resp = client.put("/dashboard/layout", json=payload, headers=headers)
    assert resp.status_code == 422


def test_update_layout_rejects_overflow(client, auth_headers):
    headers, _ = auth_headers
    payload = {
        "spaces": [
            {
                "name": "Overview",
                "position": 0,
                "is_default": True,
                "widgets": [
                    {
                        "widget_type": "category_pie",
                        "col_x": 8,
                        "col_y": 0,
                        "col_span": 6,
                        "row_span": 2,
                    }
                ],
            }
        ]
    }
    resp = client.put("/dashboard/layout", json=payload, headers=headers)
    assert resp.status_code == 422


def test_update_layout_requires_exactly_one_default(client, auth_headers):
    headers, _ = auth_headers
    payload = {
        "spaces": [
            {
                "name": "Overview",
                "position": 0,
                "is_default": False,
                "widgets": [
                    {
                        "widget_type": "transactions",
                        "col_x": 0,
                        "col_y": 0,
                        "col_span": 12,
                        "row_span": 3,
                    }
                ],
            }
        ]
    }
    resp = client.put("/dashboard/layout", json=payload, headers=headers)
    assert resp.status_code == 422


def test_update_layout_supports_multi_space(client, auth_headers):
    headers, _ = auth_headers
    payload = {
        "spaces": [
            {
                "name": "Overview",
                "position": 0,
                "is_default": True,
                "widgets": [
                    {
                        "widget_type": "period_stats_4up",
                        "col_x": 0,
                        "col_y": 0,
                        "col_span": 12,
                        "row_span": 1,
                    }
                ],
            },
            {
                "name": "Wealth",
                "position": 1,
                "is_default": False,
                "widgets": [
                    {
                        "widget_type": "net_worth",
                        "col_x": 0,
                        "col_y": 0,
                        "col_span": 12,
                        "row_span": 2,
                    }
                ],
            },
        ]
    }
    resp = client.put("/dashboard/layout", json=payload, headers=headers)
    assert resp.status_code == 200
    spaces = resp.json()["spaces"]
    assert len(spaces) == 2
    assert {s["name"] for s in spaces} == {"Overview", "Wealth"}


def test_layout_isolated_per_user(client, auth_headers, second_auth):
    h1, _ = auth_headers
    h2, _ = second_auth
    client.get("/dashboard/layout", headers=h1)
    client.get("/dashboard/layout", headers=h2)

    # Mutate user 1's layout to a single widget
    payload = {
        "spaces": [
            {
                "name": "Overview",
                "position": 0,
                "is_default": True,
                "widgets": [
                    {
                        "widget_type": "category_pie",
                        "col_x": 0,
                        "col_y": 0,
                        "col_span": 6,
                        "row_span": 2,
                    }
                ],
            }
        ]
    }
    client.put("/dashboard/layout", json=payload, headers=h1)

    user1_widgets = client.get("/dashboard/layout", headers=h1).json()["spaces"][0]["widgets"]
    user2_widgets = client.get("/dashboard/layout", headers=h2).json()["spaces"][0]["widgets"]
    assert len(user1_widgets) == 1
    assert len(user2_widgets) > 1
