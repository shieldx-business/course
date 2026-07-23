import secrets
import time
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from app.core.deps import get_current_user
from app.db.mongodb import get_db

router = APIRouter()

# In-memory token store; replace with Redis in production
_stream_tokens: dict[str, dict] = {}


def _has_access(user: dict, course: dict, lesson_index: int) -> bool:
    # Admin always has access
    if user.get("role") == "admin":
        return True
    # TODO: check active subscription or trial within first 10% of lessons
    return True


@router.post("/lessons/{lesson_id}/stream-token")
async def create_stream_token(lesson_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    # Find lesson across courses
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
        "expires": time.time() + 300,
    }
    return {"stream_url": f"/api/v1/stream/{token}", "expires_in": 300}


@router.get("/stream/{token}")
async def stream_video(token: str):
    data = _stream_tokens.pop(token, None)
    if not data or data["expires"] < time.time():
        raise HTTPException(status_code=403, detail="Invalid or expired stream token")

    # TODO: use Google Drive service account to stream actual bytes.
    # For now, return a short placeholder MP4 so the player loads.
    placeholder = (
        b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isommp41"
    )
    return StreamingResponse(
        iter([placeholder]),
        media_type="video/mp4",
        headers={
            "Content-Disposition": "inline",
            "Accept-Ranges": "bytes",
        },
    )
