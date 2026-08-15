import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request

from app.core.config import settings

# In-memory sliding-window rate limiter. Suitable for a single-process
# deployment. For multi-worker / load-balanced setups, back this with a shared
# store (e.g. Redis) and derive the client IP from X-Forwarded-For.
_LOCK = Lock()
_HITS: dict[str, deque] = defaultdict(deque)


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client = forwarded.split(",")[0].strip()
    elif request.client:
        client = request.client.host
    else:
        client = "unknown"
    return f"{client}:{request.url.path}"


class RateLimiter:
    """Reject requests once ``times`` calls from the same client+route occur
    within ``seconds``. Raises 429 when exceeded."""

    def __init__(self, times: int, seconds: int):
        self.times = times
        self.seconds = seconds

    def __call__(self, request: Request):
        if not settings.RATE_LIMIT_ENABLED:
            return
        key = _client_key(request)
        now = time.time()
        with _LOCK:
            window = _HITS[key]
            while window and window[0] <= now - self.seconds:
                window.popleft()
            if len(window) >= self.times:
                wait = int(window[0] + self.seconds - now) + 1
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Retry after {wait}s",
                )
            window.append(now)


# Heavy / compute-bound endpoints get tighter limits.
train_limiter = RateLimiter(times=10, seconds=60)
predict_limiter = RateLimiter(times=30, seconds=60)
eda_limiter = RateLimiter(times=30, seconds=60)
