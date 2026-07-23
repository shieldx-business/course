import math
import secrets
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.core.deps import get_current_user
from app.db.mongodb import get_db
from app.services.drive import is_drive_configured, get_file_bytes

router = APIRouter()

# In-memory token store; replace with Redis in production
_stream_tokens: dict[str, dict] = {}


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

    token = secrets.token_urlsafe(32)
    _stream_tokens[token] = {
        "user_id": user["id"],
        "lesson_id": lesson_id,
        "course_id": course["_id"],
        "drive_file_id": lesson.get("drive_file_id"),
        "expires": time.time() + 300,
    }
    return {"stream_url": f"/stream/{token}", "expires_in": 300}


@router.get("/stream/{token}")
async def stream_video(token: str, request: Request):
    data = _stream_tokens.pop(token, None)
    if not data or data["expires"] < time.time():
        raise HTTPException(status_code=403, detail="Invalid or expired stream token")

    # Watermark claim is embedded in the short-lived token; dynamic re-encoding would happen here.
    drive_file_id = data.get("drive_file_id")
    if is_drive_configured() and drive_file_id:
        try:
            file_bytes = await get_file_bytes(drive_file_id)
            if file_bytes:
                return StreamingResponse(
                    iter([file_bytes]),
                    media_type="video/mp4",
                    headers={
                        "Content-Disposition": "inline",
                        "Accept-Ranges": "bytes",
                        "X-Watermark-User": data["user_id"],
                    },
                )
        except Exception:
            pass

    # Fallback placeholder MP4
    placeholder = b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isommp41"
    return StreamingResponse(
        iter([placeholder]),
        media_type="video/mp4",
        headers={
            "Content-Disposition": "inline",
            "Accept-Ranges": "bytes",
            "X-Watermark-User": data["user_id"],
        },
    )
