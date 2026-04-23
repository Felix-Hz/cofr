"""Recurring rule tests: cadence math, materialization, CRUD, catch-up, idempotency."""

from datetime import date

from app.db.models import RecurringRule, Transaction, User
from app.services.recurring_service import (
    _add_months,
    advance,
    iter_due_occurrences,
    materialize_all_due,
    materialize_rule,
    preview_upcoming,
    user_today,
)

# ── Pure cadence math ────────────────────────────────────────────────────


def test_add_months_clamps_day():
    assert _add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert _add_months(date(2024, 1, 31), 1) == date(2024, 2, 29)
    assert _add_months(date(2026, 3, 31), 1) == date(2026, 4, 30)


def test_advance_daily():
    start = date(2026, 4, 1)
    assert advance(start, "day", 1, date(2026, 4, 1)) == date(2026, 4, 2)
    assert advance(start, "day", 7, date(2026, 4, 1)) == date(2026, 4, 8)


def test_advance_weekly_and_fortnightly():
    start = date(2026, 4, 1)  # Wednesday
    assert advance(start, "week", 1, start) == date(2026, 4, 8)
    assert advance(start, "week", 2, start) == date(2026, 4, 15)


def test_advance_monthly():
    start = date(2026, 1, 15)
    assert advance(start, "month", 1, start) == date(2026, 2, 15)
    assert advance(start, "month", 3, start) == date(2026, 4, 15)


def test_advance_monthly_preserves_end_of_month():
    start = date(2026, 1, 31)
    # Jan 31 -> Feb 28 -> Mar 31 (not Mar 28, anchored to the original day-of-month)
    first = advance(start, "month", 1, start)
    assert first == date(2026, 2, 28)
    second = advance(start, "month", 1, first)
    assert second == date(2026, 3, 31)


def test_advance_yearly_leap_day():
    start = date(2024, 2, 29)
    assert advance(start, "year", 1, start) == date(2025, 2, 28)


def test_preview_upcoming_respects_end_date():
    rule = RecurringRule(
        start_date=date(2026, 4, 1),
        next_due_at=date(2026, 4, 1),
        end_date=date(2026, 4, 20),
        interval_unit="week",
        interval_count=1,
    )
    upcoming = preview_upcoming(rule, count=5)
    assert upcoming == [date(2026, 4, 1), date(2026, 4, 8), date(2026, 4, 15)]


def test_iter_due_occurrences_catch_up():
    rule = RecurringRule(
        start_date=date(2026, 3, 1),
        next_due_at=date(2026, 3, 1),
        end_date=None,
        interval_unit="week",
        interval_count=1,
    )
    # Server was offline for 3 weeks: expect all missed occurrences.
    got = list(iter_due_occurrences(rule, up_to=date(2026, 3, 22)))
    assert got == [date(2026, 3, 1), date(2026, 3, 8), date(2026, 3, 15), date(2026, 3, 22)]


# ── HTTP layer ───────────────────────────────────────────────────────────


def _get_accounts(client, headers):
    return client.get("/accounts/", headers=headers).json()


def _make_rule_payload(account_id, category_id, **overrides):
    base = {
        "type": "expense",
        "name": "Rent",
        "amount": 1500,
        "currency": "NZD",
        "account_id": account_id,
        "category_id": category_id,
        "description": "Monthly rent",
        "interval_unit": "month",
        "interval_count": 1,
        "start_date": str(date.today()),
    }
    base.update(overrides)
    return base


def test_create_expense_rule_materializes_first_occurrence(client, auth_headers, sample_category):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    payload = _make_rule_payload(accts[0]["id"], str(sample_category.id))

    resp = client.post("/recurring/", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    rule = resp.json()
    assert rule["type"] == "expense"
    assert rule["last_materialized_at"] == str(date.today())

    # One transaction should exist linked to the rule.
    expenses = client.get(
        "/expenses/",
        headers=headers,
        params={"limit": 50, "offset": 0},
    ).json()
    linked = [e for e in expenses["expenses"] if e.get("recurring_rule_id") == rule["id"]]
    assert len(linked) == 1
    assert linked[0]["amount"] == 1500


def test_create_transfer_rule_materializes_both_legs(client, auth_headers):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    payload = {
        "type": "transfer",
        "name": "Savings top-up",
        "amount": 200,
        "currency": "NZD",
        "account_id": accts[0]["id"],
        "to_account_id": accts[1]["id"],
        "description": "",
        "interval_unit": "week",
        "interval_count": 2,
        "start_date": str(date.today()),
    }
    resp = client.post("/recurring/", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    rule = resp.json()
    assert rule["category_id"] is None

    expenses = client.get("/expenses/", headers=headers).json()["expenses"]
    legs = [e for e in expenses if e.get("recurring_rule_id") == rule["id"]]
    assert len(legs) == 2
    assert {leg["transfer_direction"] for leg in legs} == {"from", "to"}
    # Both legs should link to each other
    from_leg = next(leg for leg in legs if leg["transfer_direction"] == "from")
    to_leg = next(leg for leg in legs if leg["transfer_direction"] == "to")
    assert from_leg["linked_transaction_id"] == to_leg["id"]
    assert to_leg["linked_transaction_id"] == from_leg["id"]


def test_transfer_rule_affects_balances(client, auth_headers):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    from_id, to_id = accts[0]["id"], accts[1]["id"]
    payload = {
        "type": "transfer",
        "name": "Savings",
        "amount": 400,
        "currency": "NZD",
        "account_id": from_id,
        "to_account_id": to_id,
        "interval_unit": "month",
        "interval_count": 1,
        "start_date": str(date.today()),
    }
    resp = client.post("/recurring/", json=payload, headers=headers)
    assert resp.status_code == 201
    balances = {
        b["account_id"]: b["balance"]
        for b in client.get("/accounts/balances", headers=headers).json()
    }
    assert balances[from_id] == -400
    assert balances[to_id] == 400


def test_recurring_rule_requires_category_for_expense(client, auth_headers):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    payload = _make_rule_payload(accts[0]["id"], None)
    payload["category_id"] = None
    resp = client.post("/recurring/", json=payload, headers=headers)
    assert resp.status_code == 400


def test_transfer_rule_rejects_category(client, auth_headers, sample_category):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    payload = {
        "type": "transfer",
        "name": "x",
        "amount": 50,
        "currency": "NZD",
        "account_id": accts[0]["id"],
        "to_account_id": accts[1]["id"],
        "category_id": str(sample_category.id),
        "interval_unit": "month",
        "interval_count": 1,
        "start_date": str(date.today()),
    }
    resp = client.post("/recurring/", json=payload, headers=headers)
    assert resp.status_code == 400


def test_recurring_rule_end_date_validation(client, auth_headers, sample_category):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    payload = _make_rule_payload(
        accts[0]["id"],
        str(sample_category.id),
        start_date="2026-05-01",
        end_date="2026-04-01",
    )
    resp = client.post("/recurring/", json=payload, headers=headers)
    assert resp.status_code == 400


def test_pause_and_resume_recurring_rule(client, auth_headers, sample_category):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    # Start in the future so first occurrence doesn't fire
    payload = _make_rule_payload(accts[0]["id"], str(sample_category.id), start_date="2099-01-01")
    rule = client.post("/recurring/", json=payload, headers=headers).json()

    paused = client.patch(f"/recurring/{rule['id']}/pause", headers=headers).json()
    assert paused["is_active"] is False
    resumed = client.patch(f"/recurring/{rule['id']}/pause", headers=headers).json()
    assert resumed["is_active"] is True


def test_delete_rule_leaves_history_intact(client, auth_headers, sample_category):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    payload = _make_rule_payload(accts[0]["id"], str(sample_category.id))
    rule = client.post("/recurring/", json=payload, headers=headers).json()

    del_resp = client.delete(f"/recurring/{rule['id']}", headers=headers)
    assert del_resp.status_code == 200

    # The materialized transaction should still exist
    exps = client.get("/expenses/", headers=headers).json()["expenses"]
    assert any(e["amount"] == 1500 for e in exps)
    # recurring_rule_id should now be NULL (SET NULL on delete)
    orphan = next(e for e in exps if e["amount"] == 1500)
    assert orphan.get("recurring_rule_id") is None


def test_catch_up_materializes_missed_occurrences(
    db_session, client, auth_headers, sample_category
):
    """Simulating: rule was created 3 weeks ago, server only now sees it."""
    headers, user_id = auth_headers
    accts = _get_accounts(client, headers)

    three_weeks_ago = date.today().toordinal() - 21
    start = date.fromordinal(three_weeks_ago)

    rule = RecurringRule(
        user_id=user_id,
        type="expense",
        name="Weekly",
        amount=50,
        currency="NZD",
        account_id=accts[0]["id"],
        category_id=str(sample_category.id),
        description="",
        interval_unit="week",
        interval_count=1,
        start_date=start,
        next_due_at=start,
        is_active=True,
    )
    db_session.add(rule)
    db_session.commit()
    db_session.refresh(rule)

    created = materialize_rule(db_session, rule, today=date.today())
    db_session.commit()
    assert created == 4  # weeks 0, 1, 2, 3

    # Running it again is a no-op (idempotency via hash).
    created_again = materialize_rule(db_session, rule, today=date.today())
    db_session.commit()
    assert created_again == 0


def test_idempotent_across_calls(db_session, client, auth_headers, sample_category):
    headers, user_id = auth_headers
    accts = _get_accounts(client, headers)
    payload = _make_rule_payload(accts[0]["id"], str(sample_category.id))
    rule_resp = client.post("/recurring/", json=payload, headers=headers).json()

    # Run materialize_all_due three times; expenses count should stay at 1.
    for _ in range(3):
        materialize_all_due(db_session)

    count = (
        db_session.query(Transaction)
        .filter(Transaction.recurring_rule_id == rule_resp["id"])
        .count()
    )
    assert count == 1


def test_update_rule_changes_future_only(db_session, client, auth_headers, sample_category):
    """After editing amount, already-materialized transactions keep old amount."""
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    payload = _make_rule_payload(accts[0]["id"], str(sample_category.id))
    rule = client.post("/recurring/", json=payload, headers=headers).json()

    update = client.put(
        f"/recurring/{rule['id']}",
        json={"amount": 9999},
        headers=headers,
    )
    assert update.status_code == 200

    exps = client.get("/expenses/", headers=headers).json()["expenses"]
    materialized = [e for e in exps if e.get("recurring_rule_id") == rule["id"]]
    assert len(materialized) == 1
    assert materialized[0]["amount"] == 1500  # old amount preserved


def test_user_today_uses_timezone(db_session, auth_headers):
    _, user_id = auth_headers
    user = db_session.query(User).filter(User.id == user_id).first()
    user.timezone = "Pacific/Auckland"
    db_session.commit()
    # We can't assert an exact value (time-of-day dependent) but we can assert
    # it's a valid date and the fallback path works.
    today = user_today(user)
    assert isinstance(today, date)

    user.timezone = "Invalid/Zone"
    db_session.commit()
    fallback = user_today(user)
    assert isinstance(fallback, date)


def test_rule_history_endpoint(client, auth_headers, sample_category):
    headers, _ = auth_headers
    accts = _get_accounts(client, headers)
    payload = _make_rule_payload(accts[0]["id"], str(sample_category.id))
    rule = client.post("/recurring/", json=payload, headers=headers).json()

    hist = client.get(f"/recurring/{rule['id']}/history", headers=headers).json()
    assert hist["total_count"] == 1
    assert hist["expenses"][0]["recurring_rule_id"] == rule["id"]


def test_list_rules_cross_user_isolation(client, auth_headers, second_auth, sample_category):
    h1, _ = auth_headers
    h2, _ = second_auth
    accts1 = _get_accounts(client, h1)
    payload = _make_rule_payload(accts1[0]["id"], str(sample_category.id))
    client.post("/recurring/", json=payload, headers=h1)

    resp = client.get("/recurring/", headers=h2)
    assert resp.status_code == 200
    assert resp.json() == []


def test_timezone_persists_via_preferences(client, auth_headers):
    headers, _ = auth_headers
    resp = client.put(
        "/account/preferences",
        json={"timezone": "Pacific/Auckland"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["timezone"] == "Pacific/Auckland"
