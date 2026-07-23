import math
import secrets
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response, StreamingResponse
from app.core.deps import get_current_user
from app.db.mongodb import get_db
from app.services.drive import is_drive_configured, get_file_bytes
from app.services import watermark as watermark_service

router = APIRouter()

# In-memory token and session stores; replace with Redis in production
_stream_tokens: dict[str, dict] = {}
_user_tokens: dict[str, list[str]] = {}
MAX_CONCURRENT_STREAMS = 2


def _cleanup_user_tokens(user_id: str):
    now = time.time()
    tokens = _user_tokens.get(user_id, [])
    tokens = [t for t in tokens if t in _stream_tokens and _stream_tokens[t]["expires"] > now]
    _user_tokens[user_id] = tokens
    return tokens


def _trial_unlocked_count(course: dict) -> int:
    return max(1, math.ceil(len(course.get("syllabus", [])) * 0.1))


def _trial_active(user: dict) -> bool:
    if not user.get("trial_active"):
        return False
    expires = user.get("trial_expires")
    if not expires:
        return False
    try:
        expires_dt = datetime.fromisoformat(expires)
        if expires_dt.tzinfo is None:
            expires_dt = expires_dt.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) < expires_dt
    except Exception:
        return False


async def _has_access(user: dict, course: dict, lesson_index: int, db) -> bool:
    if user.get("role") == "admin":
        return True
    if _trial_active(user) and lesson_index < _trial_unlocked_count(course):
        return True
    sub = await db.subscriptions.find_one({"user_id": user["id"], "status": "active"})
    if not sub:
        return False
    try:
        ends_at = datetime.fromisoformat(sub["ends_at"])
        if ends_at.tzinfo is None:
            ends_at = ends_at.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) < ends_at
    except Exception:
        return False


@router.post("/lessons/{lesson_id}/stream-token")
async def create_stream_token(lesson_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    course = None
    lesson = None
    lesson_index = -1
    async for c in db.courses.find():
        for idx, l in enumerate(c.get("syllabus", [])):
            if l["id"] == lesson_id:
                course = c
                lesson = l
                lesson_index = idx
                break
        if course:
            break

    if not course or not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    if not await _has_access(user, course, lesson_index, db):
        raise HTTPException(status_code=403, detail="Subscription or trial required")

    user_tokens = _cleanup_user_tokens(user["id"])
    if len(user_tokens) >= MAX_CONCURRENT_STREAMS:
        oldest = user_tokens[0]
        _stream_tokens.pop(oldest, None)
        user_tokens.remove(oldest)

    token = secrets.token_urlsafe(32)
    _stream_tokens[token] = {
        "user_id": user["id"],
        "user_email": user.get("email"),
        "lesson_id": lesson_id,
        "course_id": course["_id"],
        "drive_file_id": lesson.get("drive_file_id"),
        "expires": time.time() + 300,
    }
    _user_tokens.setdefault(user["id"], []).append(token)
    return {"stream_url": f"/stream/{token}", "expires_in": 300}


def _parse_range(range_header: str | None, total: int) -> tuple[int, int] | None:
    if not range_header or not range_header.startswith("bytes="):
        return None
    try:
        spec = range_header.replace("bytes=", "").split(",")[0].strip()
        start_str, end_str = spec.split("-")
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else total - 1
        if end >= total:
            end = total - 1
        if start > end or start < 0:
            return None
        return start, end
    except Exception:
        return None


async def _get_video_bytes(drive_file_id: str | None, user: dict, request: Request) -> bytes:
    if is_drive_configured() and drive_file_id:
        try:
            if request.headers.get("x-no-watermark") == "1" or user.get("role") == "admin":
                file_bytes = await get_file_bytes(drive_file_id)
            else:
                file_bytes = await watermark_service.get_watermarked_video(
                    drive_file_id, user["user_id"], user.get("email")
                )
            if file_bytes:
                return file_bytes
        except Exception:
            pass

    # Fallback placeholder MP4
    return b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isommp41"


@router.get("/stream/{token}")
async def stream_video(token: str, request: Request):
    data = _stream_tokens.get(token)
    if not data or data["expires"] < time.time():
        raise HTTPException(status_code=403, detail="Invalid or expired stream token")

    drive_file_id = data.get("drive_file_id")
    video_bytes = await _get_video_bytes(drive_file_id, {"user_id": data["user_id"], "email": data.get("user_email"), "role": "user"}, request)
    total = len(video_bytes)

    range_header = request.headers.get("range")
    byte_range = _parse_range(range_header, total)

    headers = {
        "Content-Disposition": "inline",
        "Accept-Ranges": "bytes",
        "X-Watermark-User": data["user_id"],
    }

    if byte_range:
        start, end = byte_range
        chunk = video_bytes[start : end + 1]
        headers["Content-Range"] = f"bytes {start}-{end}/{total}"
        return Response(
            content=chunk,
            status_code=status.HTTP_206_PARTIAL_CONTENT,
            headers=headers,
            media_type="video/mp4",
        )

    return StreamingResponse(
        iter([video_bytes]),
        media_type="video/mp4",
        headers=headers,
    )
