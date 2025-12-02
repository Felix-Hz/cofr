import hashlib
import hmac


def verify_telegram_auth(data: dict[str, str], bot_token: str) -> bool:
    """
    Verify Telegram Login Widget signature

    Algorithm:
    1. Create check string from sorted key-value pairs (newline-separated)
    2. Generate secret key: SHA256 of bot token
    3. Generate expected hash: HMAC-SHA256 of check string with secret key
    4. Compare with received hash using timing-safe comparison
    """
    received_hash = data.pop("hash", None)
    if not received_hash:
        return False

    # Create check string from sorted data
    check_items = [f"{k}={v}" for k, v in sorted(data.items())]
    check_string = "\n".join(check_items)

    # Generate secret key and expected hash
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    expected_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()

    # Timing-safe comparison
    return hmac.compare_digest(expected_hash, received_hash)
