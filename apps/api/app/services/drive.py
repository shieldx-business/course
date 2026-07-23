import json
import os
import httpx
from io import BytesIO
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from app.core.config import settings
from app.services import cache as cache_service

_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


def _get_credentials():
    sa_json = settings.google_service_account_json
    if not sa_json:
        return None
    try:
        info = json.loads(sa_json)
        return service_account.Credentials.from_service_account_info(info, scopes=_SCOPES)
    except Exception:
        if os.path.exists(sa_json):
            return service_account.Credentials.from_service_account_file(sa_json, scopes=_SCOPES)
        return None


def get_drive_service():
    creds = _get_credentials()
    if not creds:
        return None
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def is_drive_configured() -> bool:
    return bool(settings.google_service_account_json)


async def _google_access_token() -> str | None:
    creds = _get_credentials()
    if not creds:
        return None
    from google.auth.transport.requests import Request

    if creds.expired or not creds.token:
        creds.refresh(Request())
    return creds.token


def _cache_key(file_id: str, start: int | None, end: int | None) -> str:
    if start is None and end is None:
        return f"drive:{file_id}:all"
    return f"drive:{file_id}:{start or 0}-{end or 'end'}"


class DriveStream:
    """Async stream of a Drive file. Holds the httpx client/response open until consumed."""

    def __init__(self, client: httpx.AsyncClient, response: httpx.Response):
        self.client = client
        self.response = response

    @property
    def status(self) -> int:
        return self.response.status_code

    @property
    def headers(self) -> httpx.Headers:
        return self.response.headers

    async def iter_bytes(self):
        try:
            async for chunk in self.response.aiter_bytes():
                yield chunk
        finally:
            await self.response.aclose()
            await self.client.aclose()

    async def close(self):
        await self.response.aclose()
        await self.client.aclose()


async def stream_file(file_id: str, range_header: str | None = None) -> DriveStream | None:
    """Stream a Drive file using the same Range semantics as the client request."""
    token = await _google_access_token()
    if not token:
        return None

    headers = {"Authorization": f"Bearer {token}"}
    if range_header:
        headers["Range"] = range_header

    client = httpx.AsyncClient()
    try:
        response = await client.stream(
            "GET",
            f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media",
            headers=headers,
            timeout=60.0,
        ).__aenter__()
    except Exception:
        await client.aclose()
        return None
    return DriveStream(client, response)


async def get_file_bytes(file_id: str, start: int | None = None, end: int | None = None):
    cache = await cache_service.get_cache()
    cache_key = _cache_key(file_id, start, end)
    cached = await cache.get(cache_key)
    if cached is not None:
        return cached

    token = await _google_access_token()
    if token:
        headers = {"Authorization": f"Bearer {token}"}
        if start is not None or end is not None:
            range_header = f"bytes={start or 0}-{end if end is not None else ''}"
            headers["Range"] = range_header
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media",
                headers=headers,
                timeout=60.0,
            )
            res.raise_for_status()
            data = res.content
            await cache.setex(cache_key, 3600, data)
            return data

    # Fallback to googleapiclient (does not support range)
    service = get_drive_service()
    if not service:
        return None

    request = service.files().get_media(fileId=file_id)
    fh = BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while not done:
        status, done = downloader.next_chunk()
    data = fh.getvalue()
    if end is not None:
        data = data[start or 0 : end + 1]
    elif start:
        data = data[start:]
    await cache.setex(cache_key, 3600, data)
    return data
