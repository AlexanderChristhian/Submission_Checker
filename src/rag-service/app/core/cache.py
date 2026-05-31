import time
import threading
from typing import Any, Callable
from functools import wraps


class TTLCache:
    def __init__(self, default_ttl: int = 300):
        self._data: dict[str, tuple[Any, float]] = {}
        self._default_ttl = default_ttl
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            value, expiry = entry
            if time.monotonic() > expiry:
                del self._data[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        expiry = time.monotonic() + (ttl if ttl is not None else self._default_ttl)
        with self._lock:
            self._data[key] = (value, expiry)

    def delete(self, key: str) -> None:
        with self._lock:
            self._data.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()

    def invalidate_by_prefix(self, prefix: str) -> None:
        with self._lock:
            keys = [k for k in self._data if k.startswith(prefix)]
            for k in keys:
                del self._data[k]

    @property
    def size(self) -> int:
        with self._lock:
            self._evict_expired()
            return len(self._data)

    def _evict_expired(self) -> None:
        now = time.monotonic()
        expired = [k for k, (_, exp) in self._data.items() if now > exp]
        for k in expired:
            del self._data[k]


response_cache: TTLCache = TTLCache(default_ttl=60)


def cached(ttl: int = 60, key_prefix: str = "") -> Callable:
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            parts = [key_prefix, func.__name__]
            for k, v in kwargs.items():
                parts.append(f"{k}={v}")
            for a in args:
                parts.append(str(a))
            cache_key = ":".join(parts)

            cached_value = response_cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            result = await func(*args, **kwargs)
            response_cache.set(cache_key, result, ttl=ttl)
            return result

        return wrapper

    return decorator
