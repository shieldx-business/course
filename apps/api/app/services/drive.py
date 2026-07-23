import json
import os
from io import BytesIO
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from app.core.config import settings

_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


def _get_credentials():
    sa_json = settings.google_service_account_json
    if not sa_json:
        return None
    try:
        info = json.loads(sa_json)
        return service_account.Credentials.from_service_account_info(info, scopes=_SCOPES)
    except Exception:
        # If it's a file path, try loading it
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


async def get_file_bytes(file_id: str, start: int = 0, end: int | None = None):
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
        data = data[start : end + 1]
    elif start:
        data = data[start:]
    return data
