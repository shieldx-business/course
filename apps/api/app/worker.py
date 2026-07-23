import asyncio
from datetime import datetime, timezone, timedelta
from app.db.mongodb import get_db
from app.services import email as email_service
from app.services import ai as ai_service
from app.services import cache as cache_service


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
        days_left = (datetime.fromisoformat(sub["ends_at"]) - now).days
        if days_left in (7, 1):
            email_service.send_renewal_reminder(user["email"], sub.get("tier", "Ascendly"), sub["ends_at"], days_left)


async def _run_forecast_job():
    db = get_db()
    orders = await db.orders.find().to_list(10000)
    forecast = ai_service.forecast_revenue(orders, 30)
    await cache_service.cached_json("forecast:latest", lambda: forecast, ttl=3600)


async def _worker_loop(app):
    while True:
        try:
            await _run_renewal_reminders()
            await _run_forecast_job()
        except Exception:
            pass
        await asyncio.sleep(3600)


def start_worker(app):
    asyncio.create_task(_worker_loop(app))
