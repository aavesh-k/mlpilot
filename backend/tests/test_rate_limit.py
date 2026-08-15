import time

from app.api.rate_limit import RateLimiter
from app.core.config import settings


class _FakeRequest:
    def __init__(self, host="1.2.3.4", path="/x", forwarded=None):
        self.client = type("C", (), {"host": host})()
        self.url = type("U", (), {"path": path})()
        self.headers = {}
        if forwarded:
            self.headers["x-forwarded-for"] = forwarded


def test_rate_limiter_allows_up_to_limit_then_throttles():
    settings.RATE_LIMIT_ENABLED = True
    try:
        limiter = RateLimiter(times=3, seconds=60)
        req = _FakeRequest()
        for _ in range(3):
            limiter(req)  # should not raise
        try:
            limiter(req)
            raise AssertionError("expected HTTPException 429")
        except Exception as exc:
            from fastapi import HTTPException

            assert isinstance(exc, HTTPException)
            assert exc.status_code == 429
    finally:
        settings.RATE_LIMIT_ENABLED = False


def test_rate_limiter_disabled_when_setting_off():
    settings.RATE_LIMIT_ENABLED = False
    try:
        limiter = RateLimiter(times=1, seconds=60)
        for _ in range(50):
            limiter(_FakeRequest())  # must never raise while disabled
    finally:
        settings.RATE_LIMIT_ENABLED = False


def test_rate_limiter_keys_on_forwarded_for():
    settings.RATE_LIMIT_ENABLED = True
    try:
        limiter = RateLimiter(times=1, seconds=60)
        limiter(_FakeRequest(host="9.9.9.9", forwarded="5.5.5.5"))
        # Different forwarded IP should still be allowed (separate bucket).
        limiter(_FakeRequest(host="9.9.9.9", forwarded="6.6.6.6"))
        # Same forwarded IP trips the limit.
        try:
            limiter(_FakeRequest(host="9.9.9.9", forwarded="5.5.5.5"))
            raise AssertionError("expected HTTPException 429")
        except Exception as exc:
            from fastapi import HTTPException

            assert isinstance(exc, HTTPException)
    finally:
        settings.RATE_LIMIT_ENABLED = False


def test_rate_limiter_sliding_window_resets():
    settings.RATE_LIMIT_ENABLED = True
    try:
        # Artificial clock so the window expires immediately between calls.
        now = [1000.0]
        orig_time = time.time
        time.time = lambda: now[0]  # noqa: A001
        limiter = RateLimiter(times=1, seconds=10)
        limiter(_FakeRequest(host="7.7.7.7", path="/reset"))
        now[0] += 11  # advance past the window
        limiter(_FakeRequest(host="7.7.7.7", path="/reset"))  # should be allowed again
    finally:
        time.time = orig_time
        settings.RATE_LIMIT_ENABLED = False
