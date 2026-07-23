import time
import json
from typing import Any
from app.core.config import settings


class _MemoryStore:
    def __init__(self):
        self._data: dict[str, tuple[Any, float]] = {}

    async def setex(self, key: str, seconds: int, value: Any):
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        self._data[key] = (value, time.time() + seconds)

    async def get(self, key: str) -> Any | None:
        item = self._data.get(key)
        if not item:
            return None
        value, expires = item
        if expires < time.time():
            del self._data[key]
            return None
        return value

    async def get_json(self, key: str) -> Any | None:
        raw = await self.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return raw

    async def delete(self, key: str):
        self._data.pop(key, None)

    async def incr(self, key: str) -> int:
        current = await self.get(key)
        if current is None:
            value = 1
        else:
            try:
                value = int(current) + 1
            except Exception:
                value = 1
        await self.setex(key, 3600, str(value))
        return value

    async def expire(self, key: str, seconds: int):
        item = self._data.get(key)
        if item:
            value, _ = item
            self._data[key] = (value, time.time() + seconds)


_cache = None


async def get_cache():
    global _cache
    if _cache is None:
        try:
            import redis.asyncio as redis

            client = redis.from_url(settings.redis_url)
            await client.ping()
            _cache = client
        except Exception:
            _cache = _MemoryStore()
    return _cache


def _ensure_str(value: Any) -> str:
    if isinstance(value, bytes):
        return value.decode()
    return value


async def cached_json(key: str, loader, ttl: int = 60):
    cache = await get_cache()
    raw = await cache.get(key)
    if raw is not None:
        try:
            return json.loads(_ensure_str(raw))
        except Exception:
            pass
    data = await loader()
    await cache.setex(key, ttl, json.dumps(data))
    return data


async def invalidate(key: str):
    cache = await get_cache()
    await cache.delete(key)
