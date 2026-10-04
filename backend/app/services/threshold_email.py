"""Bounded delivery with persistent retry and a recoverable worker lease."""
import html
import logging
import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from urllib.parse import urlparse

import httpx
from sqlalchemy import and_, or_

from app.database.database import SessionLocal
from app.models.threshold_email import ThresholdEmail
from app.services.scraper import normalize_product_url

logger = logging.getLogger(__name__)


def email_delivery_configured() -> bool:
    return bool(os.getenv("RESEND_API_KEY", "").strip() and
        (os.getenv("PRICE_ALERT_FROM_EMAIL") or os.getenv("CONTACT_FROM_EMAIL") or "").strip())


def build_threshold_email(event) -> dict:
    # Validate legacy DB URLs as well as new user input; preserve the selected SKU.
    url = normalize_product_url(event.product_url)
    retailer = {"daraz.com.np": "Daraz", "onlinesaathi.com": "OnlineSaathi", "hamrobazaar.com": "HamroBazar"}[urlparse(url).hostname]
    name = html.escape(event.product_name)
    escaped_url = html.escape(url, quote=True)
    target, price = f"Rs. {event.target_price:,.2f}", f"Rs. {event.reached_price:,.2f}"
    return {
        "from": (os.getenv("PRICE_ALERT_FROM_EMAIL") or os.getenv("CONTACT_FROM_EMAIL") or "").strip(),
        "to": [event.recipient],
        "subject": "PriceWatch: your product reached its target price",
        "text": f"The product you were interested in, {event.product_name}, reached your threshold price.\n"
            f"Your target: {target}\nVerified price: {price}\nYou may want to buy it.\n"
            f"Buy on {retailer}: {url}\n\nPrices and stock may change; confirm them on the retailer's page.\n"
            "To change or remove this alert, open the product details in PriceWatch.",
        "html": f'''<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#182237">
          <main style="max-width:560px;margin:auto;background:white;padding:32px;border-radius:12px">
          <p style="color:#2563eb;font-weight:bold">PriceWatch</p><h1 style="font-size:24px">Your target price has been reached</h1>
          <p>The product you were interested in, <strong>{name}</strong>, reached your threshold price. You may want to buy it.</p>
          <p>Your target: <strong>{target}</strong><br>Verified price: <strong>{price}</strong></p>
          <p style="margin:28px 0"><a href="{escaped_url}" style="background:#2563eb;color:white;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Buy on {retailer}</a></p>
          <p>If the button does not work: <a href="{escaped_url}">{escaped_url}</a></p>
          <p style="font-size:13px;color:#526176">Prices and stock may change; confirm them on the retailer's page.
          To change or remove this alert, open the product details in PriceWatch.</p></main></body></html>''',
    }


def send_threshold_email(event):
    if not email_delivery_configured():
        raise RuntimeError("Email delivery is not configured.")
    # Use the existing Resend provider, with explicit deadlines and an event key.
    with httpx.Client(timeout=10, follow_redirects=False) as client:
        response = client.post("https://api.resend.com/emails", json=build_threshold_email(event),
            headers={"Authorization": "Bearer " + os.environ["RESEND_API_KEY"].strip(),
                     "Idempotency-Key": f"pricewatch-threshold-{event.delivery_key}"})
        response.raise_for_status()
        if not response.json().get("id"):
            raise RuntimeError("Email provider did not confirm acceptance.")


def deliver_threshold_emails(session_factory=None, batch_size=20):
    factory = session_factory or SessionLocal
    sent = 0
    # Claim one at a time: no database transaction/connection is held during HTTP.
    for _ in range(batch_size):
        now = datetime.now(timezone.utc)
        token = str(uuid4())
        with factory() as db:
            event = db.query(ThresholdEmail).filter(or_(
                and_(ThresholdEmail.status == "pending", ThresholdEmail.next_attempt_at <= now),
                and_(ThresholdEmail.status == "sending", ThresholdEmail.lease_until <= now)
            )).order_by(ThresholdEmail.id).with_for_update(skip_locked=True).first()
            if event is None:
                break
            event.status, event.claim_token = "sending", token
            event.lease_until = now + timedelta(minutes=5)
            event.attempts += 1
            db.commit()
            # Works even with expire_on_commit=True factories.
            db.refresh(event)
            db.expunge(event)
        error = None
        try:
            send_threshold_email(event)
        except Exception as exc:
            # Persist a generic error; provider responses may contain private data.
            error = "Email delivery is not configured." if not email_delivery_configured() else "Email delivery failed; retry scheduled."
            logger.warning("Threshold email %s failed (%s)", event.id, type(exc).__name__)
        with factory() as db:
            current = db.query(ThresholdEmail).filter(ThresholdEmail.id == event.id,
                ThresholdEmail.status == "sending", ThresholdEmail.claim_token == token).with_for_update().first()
            if current is None:
                continue  # Removed/edited during delivery, or lease claimed elsewhere.
            current.lease_until = None
            current.claim_token = None
            current.last_error = error
            if error:
                current.status = "pending"
                current.next_attempt_at = datetime.now(timezone.utc) + timedelta(seconds=min(21600, 60 * 2 ** min(current.attempts - 1, 9)))
            else:
                current.status = "sent"
                current.sent_at = datetime.now(timezone.utc)
                sent += 1
            db.commit()
    return sent
