from fastapi import Request, HTTPException, status
from app.services import cache as cache_service


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def rate_limit(request: Request, key: str, limit: int, window: int):
    cache = await cache_service.get_cache()
    rate_key = f"rate:{key}:{request.url.path}"
    current = await cache.incr(rate_key)
    if current == 1:
        await cache.expire(rate_key, window)
    if current > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )
