import json
from datetime import datetime, timezone
from app.db.mongodb import get_db
from app.services import ai as ai_service
from app.services import cache as cache_service


async def run_forecast_job():
    db = get_db()
    orders = await db.orders.find().to_list(10000)
    forecast = ai_service.forecast_revenue(orders, 30)
    cache = await cache_service.get_cache()
    await cache.setex("forecast:latest", 3600, json.dumps(forecast))
