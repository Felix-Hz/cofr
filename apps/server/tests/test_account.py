"""User account management: password change, deletion, preferences."""

import os

import jwt as pyjwt

from app.db.models import Account, AuthProvider, Transaction, User
from tests.conftest import VALID_PASSWORD, register_user

# ── Password change ──


def test_change_password_success(client, auth_headers):
    headers, _ = auth_headers
    new_pw = "NewPass1!!"

    resp = client.put(
        "/account/password",
        json={"current_password": VALID_PASSWORD, "new_password": new_pw},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # Old password should fail on login
    login_old = client.post(
        "/auth/local/login",
        json={"email": "test@example.com", "password": VALID_PASSWORD},
    )
    assert login_old.status_code == 401

    # New password should work
    login_new = client.post(
        "/auth/local/login",
        json={"email": "test@example.com", "password": new_pw},
    )
    assert login_new.status_code == 200


def test_change_password_wrong_current(client, auth_headers):
    headers, _ = auth_headers
    resp = client.put(
        "/account/password",
        json={"current_password": "WrongOne1!", "new_password": "Another1!"},
        headers=headers,
    )
    assert resp.status_code == 400


def test_change_password_weak_new_422(client, auth_headers):
    headers, _ = auth_headers
    resp = client.put(
        "/account/password",
        json={"current_password": VALID_PASSWORD, "new_password": "weak"},
        headers=headers,
    )
    assert resp.status_code == 422


# ── Account deletion ──


def test_soft_delete_blocks_auth(client, db_session):
    token = register_user(client, email="softdel@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.request(
        "DELETE",
        "/account",
        json={"mode": "soft", "confirmation_text": "DELETE", "password": VALID_PASSWORD},
        headers=headers,
    )
    assert resp.status_code == 200

    # Authenticated request should now be blocked
    assert client.get("/expenses/", headers=headers).status_code == 401


def test_hard_delete_removes_all_data(client, db_session, system_categories):
    token = register_user(client, email="harddel@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Find user ID
    payload = pyjwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    user_id = payload["user_id"]

    # Create some data first
    client.get("/accounts/", headers=headers)  # provisions system accounts
    cat_id = str(system_categories["food"].id)
    client.post(
        "/expenses/",
        json={"amount": 10, "category_id": cat_id, "currency": "NZD"},
        headers=headers,
    )

    resp = client.request(
        "DELETE",
        "/account",
        json={"mode": "hard", "confirmation_text": "DELETE", "password": VALID_PASSWORD},
        headers=headers,
    )
    assert resp.status_code == 200

    # Verify everything is gone
    assert db_session.query(User).filter(User.id == user_id).first() is None
    assert db_session.query(AuthProvider).filter(AuthProvider.user_id == user_id).count() == 0
    assert db_session.query(Account).filter(Account.user_id == user_id).count() == 0
    assert db_session.query(Transaction).filter(Transaction.user_id == user_id).count() == 0


def test_delete_wrong_confirmation_text(client, auth_headers):
    headers, _ = auth_headers
    resp = client.request(
        "DELETE",
        "/account",
        json={"mode": "soft", "confirmation_text": "WRONG", "password": VALID_PASSWORD},
        headers=headers,
    )
    assert resp.status_code == 400


def test_delete_wrong_password(client, auth_headers):
    headers, _ = auth_headers
    resp = client.request(
        "DELETE",
        "/account",
        json={"mode": "hard", "confirmation_text": "DELETE", "password": "WrongOne1!"},
        headers=headers,
    )
    assert resp.status_code == 400


# ── Profile ──


def test_get_profile(client, auth_headers):
    headers, _ = auth_headers
    resp = client.get("/account/profile", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["preferred_currency"] == "NZD"
    assert "session_timeout_minutes" in body


# ── Preferences ──


def test_update_preferences(client, auth_headers):
    headers, _ = auth_headers

    # Get accounts to get a valid account ID
    accts = client.get("/accounts/", headers=headers).json()
    acct_id = accts[0]["id"]

    resp = client.put(
        "/account/preferences",
        json={
            "preferred_currency": "USD",
            "session_timeout_minutes": 30,
            "default_account_id": acct_id,
        },
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["preferred_currency"] == "USD"
    assert body["session_timeout_minutes"] == 30
    assert body["default_account_id"] == acct_id


def test_update_preferences_invalid_timeout_422(client, auth_headers):
    headers, _ = auth_headers
    resp = client.put(
        "/account/preferences",
        json={"session_timeout_minutes": 999},
        headers=headers,
    )
    assert resp.status_code == 422
