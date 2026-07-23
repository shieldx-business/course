import asyncio
import logging
from datetime import datetime, timezone, timedelta
from app.db.mongodb import get_db
from app.services import email as email_service
from app.services import ai as ai_service
from app.services import cache as cache_service

logger = logging.getLogger("ascendly.worker")

_worker_task: asyncio.Task | None = None


async def _run_renewal_reminders():
    db = get_db()
    now = datetime.now(timezone.utc)
    upcoming = await db.subscriptions.find({
        "status": "active",
        "ends_at": {"$gte": now.isoformat(), "$lte": (now + timedelta(days=7)).isoformat()},
    }).to_list(1000)

    for sub in upcoming:
        user = await db.users.find_one({"_id": sub["user_id"]})
        if not user:
            continue
        try:
            days_left = (datetime.fromisoformat(sub["ends_at"]) - now).days
            if days_left in (7, 1):
                email_service.send_renewal_reminder(user["email"], sub.get("tier", "Ascendly"), sub["ends_at"], days_left)
        except Exception:
            logger.exception("Failed to send renewal reminder for user %s", sub.get("user_id"))


async def _run_forecast_job():
    db = get_db()
    orders = await db.orders.find().to_list(10000)
    forecast = ai_service.forecast_revenue(orders, 30)
    cache = await cache_service.get_cache()
    await cache.setex("forecast:latest", 3600, __import__("json").dumps(forecast))


async def _worker_loop(app, interval: int = 3600):
    while True:
        try:
            await _run_renewal_reminders()
        except Exception as exc:
            logger.exception("Renewal reminder job failed: %s", exc)

        try:
            await _run_forecast_job()
        except Exception as exc:
            logger.exception("Forecast job failed: %s", exc)

        try:
            await asyncio.sleep(interval)
        except asyncio.CancelledError:
            break


async def start_worker(app):
    global _worker_task
    stop_worker()
    _worker_task = asyncio.create_task(_worker_loop(app))


def stop_worker():
    global _worker_task
    if _worker_task and not _worker_task.done():
        _worker_task.cancel()
