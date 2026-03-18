import time
from collections import defaultdict


class RateLimiter:
    """In-memory rate limiter using sliding window of timestamps."""

    def __init__(self):
        self._store: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, max_count: int, window_seconds: int) -> bool:
        """Return True if the action is allowed, False if rate-limited."""
        now = time.time()
        cutoff = now - window_seconds
        # Prune expired timestamps
        self._store[key] = [t for t in self._store[key] if t > cutoff]
        if len(self._store[key]) >= max_count:
            return False
        self._store[key].append(now)
        return True


# Singleton instance for email rate limiting
email_rate_limiter = RateLimiter()
