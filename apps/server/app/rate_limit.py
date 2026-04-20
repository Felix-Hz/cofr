import time
from collections import defaultdict


class RateLimiter:
    """In-memory rate limiter using a sliding window of timestamps."""

    def __init__(self):
        self._store: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, max_count: int, window_seconds: int) -> bool:
        """Check and record an attempt. Returns True if allowed."""
        now = time.time()
        cutoff = now - window_seconds
        self._store[key] = [t for t in self._store[key] if t > cutoff]
        if len(self._store[key]) >= max_count:
            return False
        self._store[key].append(now)
        return True

    def is_allowed(self, key: str, max_count: int, window_seconds: int) -> bool:
        """Check without recording — use to peek before a conditional record()."""
        cutoff = time.time() - window_seconds
        self._store[key] = [t for t in self._store[key] if t > cutoff]
        return len(self._store[key]) < max_count

    def record(self, key: str) -> None:
        """Record an event unconditionally (call after is_allowed returned True)."""
        self._store[key].append(time.time())


# Singleton for email-related rate limiting (verification, password reset)
email_rate_limiter = RateLimiter()

# Singleton for auth endpoint rate limiting (login, register)
auth_rate_limiter = RateLimiter()
