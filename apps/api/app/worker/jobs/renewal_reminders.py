import logging
from datetime import datetime, timezone, timedelta
from app.db.mongodb import get_db
from app.services import email as email_service

logger = logging.getLogger("ascendly.worker")


async def run_renewal_reminders():
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
