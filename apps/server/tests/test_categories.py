"""Category CRUD + slug + toggle + delete reassign tests."""

from tests.conftest import make_category


def test_get_categories_system_and_custom(client, auth_headers, system_categories, db_session):
    headers, user_id = auth_headers
    make_category(db_session, user_id, name="My Custom")

    resp = client.get("/categories/", headers=headers)
    assert resp.status_code == 200
    cats = resp.json()
    system_count = sum(1 for c in cats if c["is_system"])
    custom_count = sum(1 for c in cats if not c["is_system"])
    assert system_count == 3
    assert custom_count == 1


def test_create_custom_category(client, auth_headers, system_categories):
    headers, _ = auth_headers
    resp = client.post(
        "/categories/",
        json={
            "name": "Transport",
            "color_light": "#22C55E",
            "color_dark": "#4ADE80",
            "type": "expense",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Transport"
    assert body["is_system"] is False
    assert body["slug"] == "transport"


def test_create_category_slug_generation(client, auth_headers, system_categories):
    headers, _ = auth_headers
    resp = client.post(
        "/categories/",
        json={
            "name": "My Category!",
            "color_light": "#000000",
            "color_dark": "#111111",
            "type": "expense",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["slug"] == "my-category"


def test_create_category_max_20(client, auth_headers, system_categories, db_session):
    headers, user_id = auth_headers
    # Seed 20 custom categories directly
    for i in range(20):
        make_category(db_session, user_id, name=f"Cat {i}", slug=f"cat-{i}")

    resp = client.post(
        "/categories/",
        json={
            "name": "One Too Many",
            "color_light": "#000000",
            "color_dark": "#111111",
            "type": "expense",
        },
        headers=headers,
    )
    assert resp.status_code == 400


def test_create_category_alias_conflict(client, auth_headers, system_categories, db_session):
    headers, user_id = auth_headers
    cat = make_category(db_session, user_id, name="Existing")
    # Manually set alias
    cat.alias = "EX"
    db_session.commit()

    resp = client.post(
        "/categories/",
        json={
            "name": "Another",
            "color_light": "#000000",
            "color_dark": "#111111",
            "type": "expense",
            "alias": "EX",
        },
        headers=headers,
    )
    assert resp.status_code == 409


def test_update_custom_category(client, auth_headers, system_categories, db_session):
    headers, user_id = auth_headers
    cat = make_category(db_session, user_id, name="Old Name")

    resp = client.put(
        f"/categories/{cat.id}",
        json={"name": "New Name"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"
    assert resp.json()["slug"] == "new-name"


def test_update_system_category_403(client, auth_headers, system_categories):
    headers, _ = auth_headers
    sys_cat_id = str(system_categories["food"].id)

    resp = client.put(
        f"/categories/{sys_cat_id}",
        json={"name": "Renamed"},
        headers=headers,
    )
    assert resp.status_code == 403


def test_delete_category_keeps_transaction_reference(
    client, auth_headers, system_categories, db_session
):
    headers, user_id = auth_headers
    cat = make_category(db_session, user_id, name="Doomed")
    cat_id = str(cat.id)

    # Create expense with the category
    client.post(
        "/expenses/",
        json={"amount": 10, "category_id": cat_id, "currency": "NZD"},
        headers=headers,
    )

    resp = client.delete(f"/categories/{cat_id}", headers=headers)
    assert resp.status_code == 200

    # Category is soft-deleted: transaction still references the original category_id
    expenses = client.get("/expenses/", headers=headers).json()["expenses"]
    assert len(expenses) == 1
    assert expenses[0]["category_id"] == cat_id

    # Category no longer appears in the category list
    cats = client.get("/categories/", headers=headers).json()
    cat_ids = [c["id"] for c in cats]
    assert cat_id not in cat_ids


def test_delete_system_category_403(client, auth_headers, system_categories):
    headers, _ = auth_headers
    sys_cat_id = str(system_categories["food"].id)

    resp = client.delete(f"/categories/{sys_cat_id}", headers=headers)
    assert resp.status_code == 403


def test_toggle_system_category(client, auth_headers, system_categories):
    headers, _ = auth_headers
    food_id = str(system_categories["food"].id)

    # First toggle → deactivate (default is active, no pref exists yet)
    resp = client.patch(f"/categories/{food_id}/toggle", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False

    # Second toggle → re-activate
    resp2 = client.patch(f"/categories/{food_id}/toggle", headers=headers)
    assert resp2.status_code == 200
    assert resp2.json()["is_active"] is True


def test_toggle_custom_category(client, auth_headers, system_categories, db_session):
    headers, user_id = auth_headers
    cat = make_category(db_session, user_id, name="Toggleable")
    cat_id = str(cat.id)

    # Custom starts active
    resp = client.patch(f"/categories/{cat_id}/toggle", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False

    resp2 = client.patch(f"/categories/{cat_id}/toggle", headers=headers)
    assert resp2.json()["is_active"] is True
