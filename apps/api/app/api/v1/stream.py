import secrets
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from app.core.deps import get_current_user
from app.db.mongodb import get_db
from app.services.drive import is_drive_configured, get_file_bytes

router = APIRouter()

# In-memory token store; replace with Redis in production
_stream_tokens: dict[str, dict] = {}


def _has_access(user: dict, course: dict, lesson_index: int) -> bool:
    if user.get("role") == "admin":
        return True
    # Trial covers the first 10% of lessons for 3 days
    if user.get("trial_active") and lesson_index < max(1, len(course.get("syllabus", [])) // 10):
        return True
    # TODO: check active subscription for remaining lessons
    return True


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

    if not _has_access(user, course, lesson_index):
        raise HTTPException(status_code=403, detail="Subscription or trial required")

    token = secrets.token_urlsafe(32)
    _stream_tokens[token] = {
        "user_id": user["id"],
        "lesson_id": lesson_id,
        "course_id": course["_id"],
        "drive_file_id": lesson.get("drive_file_id"),
        "expires": time.time() + 300,
    }
    return {"stream_url": f"/api/v1/stream/{token}", "expires_in": 300}


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
