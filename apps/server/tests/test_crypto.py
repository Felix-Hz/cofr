"""Encryption round-trip + TypeDecorator tests."""

from app.crypto import decrypt, encrypt
from app.db.models import User


def test_encrypt_decrypt_roundtrip():
    plaintext = "hello world"
    ciphertext = encrypt(plaintext)
    assert ciphertext != plaintext
    assert decrypt(ciphertext) == plaintext


def test_encrypt_nondeterministic():
    plaintext = "same input"
    c1 = encrypt(plaintext)
    c2 = encrypt(plaintext)
    assert c1 != c2  # Fernet tokens include random IV + timestamp


def test_encrypted_string_null_passthrough():
    """EncryptedString TypeDecorator should pass None through as-is."""
    from app.db.models import EncryptedString

    td = EncryptedString()
    assert td.process_bind_param(None, None) is None
    assert td.process_result_value(None, None) is None


def test_encrypted_string_orm_roundtrip(db_session):
    """Create User with encrypted fields, read back, verify plaintext."""
    user = User(first_name="Alice", last_name="Smith", username="alice@test.com")
    db_session.add(user)
    db_session.commit()

    # Expire to force re-read from DB
    db_session.expire(user)
    fetched = db_session.query(User).filter(User.id == user.id).first()
    assert fetched.first_name == "Alice"
    assert fetched.last_name == "Smith"
    assert fetched.username == "alice@test.com"
