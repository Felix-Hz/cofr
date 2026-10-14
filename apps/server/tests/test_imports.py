"""Bank statement import. scribe is replaced by a snapshot of its real output on the
anonymised ANZ fixture, so these run without the Rust build (as in CI)."""

import copy
import json
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import patch

import pytest

from app.db.models import Category, ImportBatch, Transaction

FIXTURE_CSV = (
    Path(__file__).parents[2] / "scribe/src/import/fixtures/anz_nz_account.csv"
).read_bytes()
FIXTURE_NAME = "01-2345-6789012-00_Transactions_2025-03-11_2025-03-14.csv"
SNAPSHOT = json.loads((Path(__file__).parent / "fixtures/anz_nz_account.parsed.json").read_text())

# Row indexes in the fixture
FUEL, COFFEE_A, COFFEE_B, PARKING, GROCERY, STREAMING, RENT, SALARY, TRANSFER, INTEREST = range(10)


class FakeScribe:
    @staticmethod
    def parse_bank_csv(data: bytes, filename: str | None = None) -> dict:
        if data != FIXTURE_CSV:
            raise ValueError("Unrecognized statement format (columns: foo, bar)")
        return copy.deepcopy(SNAPSHOT)


@pytest.fixture(autouse=True)
def fake_scribe():
    with (
        patch("app.services.import_service.scribe", FakeScribe),
        patch("app.services.import_service._RUST_AVAILABLE", True),
    ):
        yield


@pytest.fixture
def cats(db_session):
    """System categories keyed by slug, matching the production seed slugs."""
    out = {}
    for order, (slug, cat_type) in enumerate(
        [
            ("income", "income"),
            ("housing", "expense"),
            ("food-dining", "expense"),
            ("transport", "expense"),
            ("miscellaneous", "expense"),
        ]
    ):
        cat = Category(
            user_id=None,
            name=slug.title(),
            slug=slug,
            color_light="#000000",
            color_dark="#ffffff",
            is_system=True,
            is_active=True,
            display_order=order,
            type=cat_type,
        )
        db_session.add(cat)
        out[slug] = cat
    db_session.commit()
    return {slug: str(c.id) for slug, c in out.items()}


@pytest.fixture
def accounts(client, auth_headers):
    headers, _ = auth_headers
    return {a["name"]: a["id"] for a in client.get("/accounts/", headers=headers).json()}


def preview(client, headers, **form):
    return client.post(
        "/imports/preview",
        headers=headers,
        files={"file": (FIXTURE_NAME, FIXTURE_CSV, "text/csv")},
        data=form,
    )


def commit(client, headers, account_id, rows, currency="NZD"):
    payload = {"account_id": account_id, "currency": currency, "rows": rows}
    return client.post(
        "/imports/",
        headers=headers,
        files={"file": (FIXTURE_NAME, FIXTURE_CSV, "text/csv")},
        data={"payload": json.dumps(payload)},
    )


def accept_suggestions(preview_json):
    return [
        {"index": r["index"], "transfer_account_id": r["suggested_transfer_account_id"]}
        if r["suggested_transfer_account_id"]
        else {"index": r["index"], "category_id": r["suggested_category_id"]}
        for r in preview_json["rows"]
        if r["status"] == "new"
    ]


def test_preview_reads_statement_and_suggests(client, auth_headers, cats, accounts):
    headers, _ = auth_headers
    resp = preview(client, headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()

    assert body["bank"] == "ANZ"
    assert body["account_ref"] == "01-2345-6789012-00"
    assert body["account_id"] == accounts["Checking"]
    assert body["account_remembered"] is False
    assert body["currency"] == "NZD"  # from the bank format, not the user's USD default
    assert (body["date_from"], body["date_to"]) == ("2025-03-11", "2025-03-14")
    assert len(body["rows"]) == 11
    assert {r["status"] for r in body["rows"]} == {"new"}

    rows = body["rows"]
    assert rows[FUEL]["direction"] == "debit"
    assert rows[FUEL]["amount"] == 84.20
    assert (rows[FUEL]["suggested_category_id"], rows[FUEL]["suggestion_source"]) == (
        cats["transport"],
        "rule",
    )
    assert rows[RENT]["suggested_category_id"] == cats["housing"]
    assert rows[SALARY]["direction"] == "credit"
    assert rows[SALARY]["suggested_category_id"] == cats["income"]
    assert (rows[COFFEE_A]["suggested_category_id"], rows[COFFEE_A]["suggestion_source"]) == (
        cats["miscellaneous"],
        "default",
    )
    # "Transfer" to "Savings Account" names exactly one other account.
    assert rows[TRANSFER]["suggestion_source"] == "transfer"
    assert rows[TRANSFER]["suggested_transfer_account_id"] == accounts["Savings"]
    assert rows[TRANSFER]["suggested_category_id"] is None


def test_commit_then_reimport_is_idempotent(client, auth_headers, cats, accounts, db_session):
    headers, _ = auth_headers
    rows = accept_suggestions(preview(client, headers).json())

    first = commit(client, headers, accounts["Checking"], rows)
    assert first.status_code == 201, first.text
    assert first.json() == {
        "batch_id": first.json()["batch_id"],
        "imported": 11,
        "transfers": 1,
        "skipped": 0,
    }

    # Double-submit imports nothing new, and leaves no empty batch in the history.
    again = commit(client, headers, accounts["Checking"], rows)
    assert (again.json()["imported"], again.json()["batch_id"]) == (0, None)
    assert len(client.get("/imports/", headers=headers).json()) == 1
    assert db_session.query(Transaction).count() == 12  # 11 rows; the transfer has two legs

    # The same bank account is remembered, and every row is recognised.
    body = preview(client, headers).json()
    assert body["account_remembered"] is True
    assert body["account_id"] == accounts["Checking"]
    assert {r["status"] for r in body["rows"]} == {"already_imported"}

    tx = db_session.query(Transaction).filter(Transaction.merchant == "Corner Fuel").one()
    assert tx.amount == 84.20
    assert tx.currency == "NZD"
    assert tx.notes == "Visa Purchase · card ••1234"
    assert tx.hash.startswith("imp:")


def test_history_drives_suggestions_and_merchant_rename(client, auth_headers, cats, accounts):
    headers, _ = auth_headers
    rows = accept_suggestions(preview(client, headers).json())
    for r in rows:
        if r["index"] in (COFFEE_A, COFFEE_B):
            r["category_id"] = cats["food-dining"]
            r["merchant"] = "Daily Grind Café"
    assert commit(client, headers, accounts["Checking"], rows).status_code == 201

    expenses = client.get("/expenses/", headers=headers, params={"limit": 50}).json()["expenses"]
    assert sum(e["merchant"] == "Daily Grind Café" for e in expenses) == 2

    # Undo and preview again: the user's choice for the merchant is now the suggestion.
    batch_id = client.get("/imports/", headers=headers).json()[0]["id"]
    client.delete(f"/imports/{batch_id}", headers=headers)
    # Recreate a history entry under the original merchant name.
    client.post(
        "/expenses/",
        headers=headers,
        json={
            "amount": 3,
            "category_id": cats["food-dining"],
            "merchant": "daily grind",
            "currency": "NZD",
            "created_at": "2024-01-01T12:00:00Z",
        },
    )
    body = preview(client, headers).json()
    coffee = body["rows"][COFFEE_A]
    assert (coffee["suggested_category_id"], coffee["suggestion_source"]) == (
        cats["food-dining"],
        "history",
    )


def test_flags_possible_duplicate_of_manual_entry(client, auth_headers, cats, accounts):
    headers, _ = auth_headers
    manual = client.post(
        "/expenses/",
        headers=headers,
        json={
            "amount": 112.37,
            "category_id": cats["food-dining"],
            "description": "groceries",
            "currency": "NZD",
            "account_id": accounts["Checking"],
            # Logged a day after the bank's posting date.
            "created_at": datetime(2025, 3, 14, 9, tzinfo=UTC).isoformat(),
        },
    ).json()

    rows = preview(client, headers).json()["rows"]
    assert rows[GROCERY]["status"] == "possible_duplicate"
    assert rows[GROCERY]["duplicate_of"]["id"] == manual["id"]
    assert rows[GROCERY]["duplicate_of"]["label"] == "groceries"
    assert sum(r["status"] == "possible_duplicate" for r in rows) == 1

    # A different account doesn't see it.
    other = preview(client, headers, account_id=accounts["Savings"]).json()["rows"]
    assert other[GROCERY]["status"] == "new"


def test_transfer_creates_linked_pair_and_undo_removes_both(
    client, auth_headers, cats, accounts, db_session
):
    headers, _ = auth_headers
    rows = accept_suggestions(preview(client, headers).json())
    assert next(r for r in rows if r["index"] == TRANSFER) == {
        "index": TRANSFER,
        "transfer_account_id": accounts["Savings"],
    }
    resp = commit(client, headers, accounts["Checking"], rows)
    assert resp.json()["transfers"] == 1

    legs = db_session.query(Transaction).filter(Transaction.is_transfer.is_(True)).all()
    by_dir = {t.transfer_direction: t for t in legs}
    assert str(by_dir["from"].account_id) == accounts["Checking"]
    assert str(by_dir["to"].account_id) == accounts["Savings"]
    assert by_dir["from"].linked_transaction_id == by_dir["to"].id
    assert by_dir["to"].hash.startswith("imp-pair:")

    batch_id = resp.json()["batch_id"]
    history = client.get("/imports/", headers=headers).json()
    assert history[0]["id"] == batch_id
    assert history[0]["account_name"] == "Checking"
    assert history[0]["imported_count"] == 11

    undo = client.delete(f"/imports/{batch_id}", headers=headers)
    assert undo.json() == {"success": True, "removed": 12}
    db_session.expire_all()
    assert db_session.query(Transaction).count() == 0
    assert db_session.query(ImportBatch).count() == 0


def test_skipped_rows_are_not_imported(client, auth_headers, cats, accounts, db_session):
    headers, _ = auth_headers
    rows = [
        r
        for r in accept_suggestions(preview(client, headers).json())
        if r["index"] not in (COFFEE_B, INTEREST)
    ]
    body = commit(client, headers, accounts["Checking"], rows).json()
    assert (body["imported"], body["skipped"]) == (9, 2)


def test_rejects_category_of_wrong_direction(client, auth_headers, cats, accounts):
    headers, _ = auth_headers
    resp = commit(
        client,
        headers,
        accounts["Checking"],
        [{"index": SALARY, "category_id": cats["food-dining"]}],
    )
    assert resp.status_code == 422
    assert "income" in resp.json()["detail"]


def test_rejects_ambiguous_or_foreign_targets(client, auth_headers, second_auth, cats, accounts):
    headers, _ = auth_headers
    both = commit(
        client,
        headers,
        accounts["Checking"],
        [
            {
                "index": FUEL,
                "category_id": cats["transport"],
                "transfer_account_id": accounts["Savings"],
            }
        ],
    )
    assert both.status_code == 422

    other_headers, _ = second_auth
    assert commit(client, other_headers, accounts["Checking"], []).status_code == 404

    batch_id = commit(
        client, headers, accounts["Checking"], [{"index": FUEL, "category_id": cats["transport"]}]
    ).json()["batch_id"]
    assert client.delete(f"/imports/{batch_id}", headers=other_headers).status_code == 404


def test_unknown_format_and_missing_engine(client, auth_headers, cats):
    headers, _ = auth_headers
    resp = client.post(
        "/imports/preview",
        headers=headers,
        files={"file": ("x.csv", b"foo,bar\n1,2\n", "text/csv")},
    )
    assert resp.status_code == 422
    assert "Unrecognized" in resp.json()["detail"]

    with patch("app.services.import_service._RUST_AVAILABLE", False):
        assert preview(client, headers).status_code == 503


def test_snapshot_matches_real_scribe():
    """Keeps the snapshot honest whenever the Rust extension is installed locally."""
    scribe = pytest.importorskip("scribe")
    if not hasattr(scribe, "parse_bank_csv"):
        pytest.skip("installed scribe predates import support")
    assert scribe.parse_bank_csv(FIXTURE_CSV, FIXTURE_NAME) == SNAPSHOT
