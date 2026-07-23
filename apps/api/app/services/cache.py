import time
from app.core.config import settings


class _MemoryStore:
    def __init__(self):
        self._data: dict[str, tuple[str, float]] = {}

    async def setex(self, key: str, seconds: int, value: str):
        self._data[key] = (value, time.time() + seconds)

    async def get(self, key: str) -> str | None:
        item = self._data.get(key)
        if not item:
            return None
        value, expires = item
        if expires < time.time():
            del self._data[key]
            return None
        return value

    async def delete(self, key: str):
        self._data.pop(key, None)


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
