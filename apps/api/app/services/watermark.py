import asyncio
import shutil
import subprocess
import tempfile
from pathlib import Path
from app.services import cache as cache_service
from app.services.drive import get_file_bytes


async def _run_ffmpeg(input_path: Path, output_path: Path, text: str):
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg not found")

    # Escape single quotes for drawtext filter
    safe_text = text.replace("'", "'\\\\''")
    filter_str = (
        f"drawtext=text='{safe_text}':fontcolor=white@0.5:fontsize=24:x=10:y=10:"
        f"box=1:boxcolor=black@0.5:boxborderw=4:reload=1"
    )
    cmd = [
        ffmpeg,
        "-y",
        "-i", str(input_path),
        "-vf", filter_str,
        "-c:a", "copy",
        "-movflags", "+faststart",
        "-f", "mp4",
        str(output_path),
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {stderr.decode()[:500]}")


async def get_watermarked_video(file_id: str, user_id: str, user_email: str | None = None) -> bytes:
    cache = await cache_service.get_cache()
    cache_key = f"watermark:{file_id}:{user_id}"
    cached = await cache.get(cache_key)
    if cached is not None:
        return cached

    text = user_email or user_id
    original = await get_file_bytes(file_id)
    if not original:
        raise RuntimeError("Could not fetch original video")

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as in_file:
        in_file.write(original)
        in_path = Path(in_file.name)

    out_path = Path(tempfile.mktemp(suffix=".mp4"))
    try:
        await _run_ffmpeg(in_path, out_path, text)
        data = out_path.read_bytes()
        await cache.setex(cache_key, 3600, data)
        return data
    finally:
        in_path.unlink(missing_ok=True)
        out_path.unlink(missing_ok=True)
