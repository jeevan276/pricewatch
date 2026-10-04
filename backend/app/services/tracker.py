"""Database work runs in workers; no connection is held during scraping."""
import logging
import math
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.crud.product import get_product_by_url, get_all_products, get_product_by_id, delete_product, update_product
from app.crud.price_history import get_price_history
from app.models.product import Product
from app.models.price_history import PriceHistory
from app.services.scraper import scrape_product, normalize_product_url
from app.services.scrapers.errors import ProductRemovedError
from app.services.alert import create_price_drop_alert
from app.services.threshold import evaluate_threshold

logger = logging.getLogger(__name__)


def _find_existing(db, url, user_id):
    product = get_product_by_url(db, url, user_id)
    if product:
        return product
    # Older deployments saved share/tracking URLs without normalization.
    for candidate in get_all_products(db, user_id):
        try:
            if normalize_product_url(candidate.url) == url:
                return candidate
        except ValueError:
            continue
    return None


def _existing(db, url, user_id):
    product = _find_existing(db, url, user_id)
    # End read transaction before waiting on network; keep detached values usable.
    db.expunge_all()
    db.rollback()
    return product


def _track_response(product, status='new'):
    return {'message': 'Product is already tracked.' if status == 'existing' else 'Product added successfully.',
            'status': status, 'old_price': None, 'new_price': product.price,
            'difference': None, 'percentage': None, 'product': product}


def _save_new(db, url, user_id, data):
    # Recheck after scrape, and let UNIQUE protect concurrent requests/workers.
    existing = _find_existing(db, url, user_id)
    if existing:
        return _track_response(existing, 'existing')
    now = datetime.now(timezone.utc)
    product = Product(name=data['name'].strip(), url=url, price=float(data['price']),
        image_url=data.get('image_url'), user_id=user_id,
        availability=data.get('availability', 'available'),
        last_checked_at=now, last_successful_check_at=now)
    try:
        db.add(product)
        db.flush()
        db.add(PriceHistory(product_id=product.id, price=product.price))
        db.commit()  # Product and initial observation are atomic.
    except IntegrityError:
        db.rollback()
        existing = _find_existing(db, url, user_id)
        if existing:
            return _track_response(existing, 'existing')
        raise
    return _track_response(product)


async def track_product(db: Session, url: str, user_id: int):
    try:
        url = normalize_product_url(url)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    existing = await run_in_threadpool(_existing, db, url, user_id)
    if existing:
        return _track_response(existing, 'existing')
    try:
        data = await scrape_product(url)
    except ProductRemovedError as exc:
        raise HTTPException(410, 'This product has been removed from the retailer.') from exc
    except Exception as exc:
        logger.warning('Product scrape failed: %s', type(exc).__name__)
        raise HTTPException(502, "The retailer could not be reached or its price could not be verified. Please retry; signing in again is not needed.") from exc
    try:
        price = float(data['price'])
        if not data.get('name') or not math.isfinite(price) or price <= 0:
            raise ValueError('Invalid product data')
    except (ValueError, TypeError, KeyError) as exc:
        raise HTTPException(502, 'The retailer returned no verified product price.') from exc
    return await run_in_threadpool(_save_new, db, url, user_id, data)


def record_check(db, product_id, data=None, error=None):
    # Serialize price changes for a product when a manual check and job overlap.
    product = db.query(Product).filter(Product.id == product_id).with_for_update().first()
    if product is None:
        return None
    now = datetime.now(timezone.utc)
    product.last_checked_at = now
    old = product.price
    if error is not None:
        if isinstance(error, ProductRemovedError):
            product.availability = 'removed'
            product.removed_at = product.removed_at or now
            product.last_check_error = None
            status = 'removed'
        else:
            # Failed checks never delete history, set price=0, or infer removal.
            product.last_check_error = 'The retailer could not be checked. Please try again later.'
            status = 'error'
        db.commit()
        return {'status': status, 'product': product, 'old_price': old, 'new_price': None}
    try:
        price = float(data['price'])
        if not math.isfinite(price) or price <= 0:
            raise ValueError('Invalid price')
    except (TypeError, ValueError, KeyError):
        return record_check(db, product_id, error=ValueError('Invalid price'))
    product.price = price
    product.availability = data.get('availability', 'available')
    product.removed_at = None
    product.last_check_error = None
    product.last_successful_check_at = now
    # Every successful observation, including unchanged prices, supplies chart data.
    db.add(PriceHistory(product_id=product.id, price=price))
    evaluate_threshold(db, product)
    db.commit()
    difference = price - old
    percentage = difference / old * 100 if old else 0
    status = 'unchanged' if difference == 0 else 'decreased' if difference < 0 else 'increased'
    if status == 'decreased':
        try:
            create_price_drop_alert(db, product, old, price, difference, percentage)
        except Exception:
            db.rollback()
            logger.exception('Price saved but notification failed')
    return {'status': status, 'product': product, 'old_price': old, 'new_price': price,
            'difference': difference, 'percentage': round(percentage, 2)}


async def track_product_price(db: Session, product):
    product_id, url = product.id, product.url
    # Detach any read state so rollback does not expire the caller's product.
    await run_in_threadpool(db.expunge_all)
    await run_in_threadpool(db.rollback)
    try:
        data = await scrape_product(url, fresh=True)
    except Exception as exc:
        return await run_in_threadpool(record_check, db, product_id, error=exc)
    return await run_in_threadpool(record_check, db, product_id, data=data)


# ============================================================
# LIST PRODUCTS
# ============================================================

def list_products(
    db: Session,
    user_id: int,
):
    """
    Return all tracked products belonging
    to the logged-in user.
    """

    return get_all_products(
        db=db,
        user_id=user_id,
    )


# ============================================================
# PRODUCT HISTORY
# ============================================================

def product_history(
    db: Session,
    product_id: int,
    user_id: int,
):
    """
    Return one product and its complete price history.

    Only returns the product if it belongs
    to the logged-in user.
    """

    product = get_product_by_id(
        db=db,
        product_id=product_id,
        user_id=user_id,
    )

    if product is None:
        return None

    history = get_price_history(
        db=db,
        product_id=product_id,
    )

    return {
        "product": product,
        "history": history,
    }


# ============================================================
# REMOVE PRODUCT
# ============================================================

def remove_product(
    db: Session,
    product_id: int,
    user_id: int,
):
    """
    Delete a tracked product.

    Only allows the logged-in user to delete
    their own product.
    """

    product = get_product_by_id(
        db=db,
        product_id=product_id,
        user_id=user_id,
    )

    if product is None:
        return None

    delete_product(
        db=db,
        product=product,
    )

    return {
        "message": "Product deleted successfully.",
        "product_id": product_id,
    }


# ============================================================
# EDIT PRODUCT
# ============================================================

def edit_product(
    db: Session,
    product_id: int,
    user_id: int,
    name: str,
    url: str,
    price: float,
    image_url: str | None = None,
):
    """
    Update product details manually.

    Only allows the logged-in user to update
    their own product.
    """

    if not name or not name.strip():
        raise HTTPException(
            status_code=400,
            detail="Product name cannot be empty.",
        )

    if price is None or not math.isfinite(price) or price <= 0:
        raise HTTPException(
            status_code=400,
            detail="Price must be a positive number.",
        )

    product = get_product_by_id(
        db=db,
        product_id=product_id,
        user_id=user_id,
    )

    if product is None:
        return None

    try:
        normalized_url = normalize_product_url(url or product.url)
        if normalized_url != normalize_product_url(product.url):
            raise ValueError("A different product must be tracked separately to preserve its price history.")
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    product = update_product(
        db=db,
        product=product,
        name=name.strip(),
        url=normalized_url,
        price=price,
        image_url=image_url,
    )

    return {
        "message": "Product updated successfully.",
        "product": product,
    }
