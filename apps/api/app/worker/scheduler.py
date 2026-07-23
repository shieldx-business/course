import asyncio
import logging
from .jobs.renewal_reminders import run_renewal_reminders
from .jobs.forecast_jobs import run_forecast_job
from .jobs.analytics_aggregation import run_analytics_aggregation

logger = logging.getLogger("ascendly.worker")

_worker_task: asyncio.Task | None = None


async def _worker_loop(app, interval: int = 3600):
    while True:
        try:
            await run_renewal_reminders()
        except Exception as exc:
            logger.exception("Renewal reminder job failed: %s", exc)

        try:
            await run_forecast_job()
        except Exception as exc:
            logger.exception("Forecast job failed: %s", exc)

        try:
            await run_analytics_aggregation()
        except Exception as exc:
            logger.exception("Analytics aggregation job failed: %s", exc)

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
