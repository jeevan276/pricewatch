"""Bounded, grouped checks with one short-lived DB session per write."""
import asyncio
import logging
import os
from datetime import datetime, timezone
from collections import defaultdict

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from starlette.concurrency import run_in_threadpool
from app.database.database import SessionLocal
from app.models.product import Product
from app.services.scraper import scrape_product
from app.services.tracker import record_check
from app.services.threshold_email import deliver_threshold_emails

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def _snapshot():
    with SessionLocal() as db:
        return db.query(Product.id, Product.url).all()


def _save(product_id, data, error):
    with SessionLocal() as db:
        try:
            record_check(db, product_id, data=data, error=error)
        except Exception:
            db.rollback()
            logger.exception('Could not save price check for product %s', product_id)


async def track_all_products():
    groups = defaultdict(list)
    for product_id, url in await run_in_threadpool(_snapshot):
        groups[url].append(product_id)
    slots = asyncio.Semaphore(2)

    async def check(url, product_ids):
        async with slots:
            data, error = None, None
            try:
                data = await scrape_product(url, fresh=True)
            except Exception as exc:
                error = exc
            for product_id in product_ids:
                await run_in_threadpool(_save, product_id, data, error)
    await asyncio.gather(*(check(url, ids) for url, ids in groups.items()))


def start_scheduler():
    if scheduler.running or os.getenv('ENABLE_SCHEDULER', 'true').lower() != 'true':
        return
    scheduler.add_job(track_all_products, trigger='interval', minutes=5,
        id='price_tracking_job', replace_existing=True, max_instances=1, coalesce=True)
    scheduler.add_job(deliver_threshold_emails, trigger='interval', minutes=1,
        id='threshold_email_job', replace_existing=True, max_instances=1, coalesce=True,
        next_run_time=datetime.now(timezone.utc))
    scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
