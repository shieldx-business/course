import json
from datetime import datetime, timezone
from app.db.mongodb import get_db
from app.services import ai as ai_service
from app.services import cache as cache_service


async def run_analytics_aggregation():
    db = get_db()
    users = await db.users.find().to_list(10000)
    progress = await db.progress.find().to_list(10000)
    subscriptions = await db.subscriptions.find().to_list(10000)
    courses = await db.courses.find().to_list(10000)
    orders = await db.orders.find().to_list(10000)

    metrics = ai_service.build_metrics(users, progress, subscriptions, courses, orders)
    cache = await cache_service.get_cache()
    await cache.setex(
        "analytics:latest",
        3600,
        json.dumps({
            **metrics,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }),
    )
