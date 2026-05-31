import time
import threading
from typing import Callable
from fastapi import HTTPException, Request
from app.utils.logger import get_logger

logger = get_logger(__name__)


class InMemoryRateLimiter:
    def __init__(self):
        self._store: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def _cleanup(self, key: str, window: float) -> None:
        now = time.monotonic()
        timestamps = self._store.get(key, [])
        self._store[key] = [t for t in timestamps if now - t < window]

    def check(self, key: str, max_requests: int, window: float = 60.0) -> bool:
        with self._lock:
            self._cleanup(key, window)
            timestamps = self._store.setdefault(key, [])
            if len(timestamps) >= max_requests:
                return False
            timestamps.append(time.monotonic())
            return True


rate_limiter = InMemoryRateLimiter()


def rate_limit(max_requests: int = 60, window: float = 60.0) -> Callable:
    def middleware(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"{client_ip}:{request.url.path}"

        if not rate_limiter.check(key, max_requests=max_requests, window=window):
            logger.warning("rate limit exceeded", extra={"client_ip": client_ip, "path": request.url.path})
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Max {max_requests} requests per {window:.0f}s",
            )

    return middleware
