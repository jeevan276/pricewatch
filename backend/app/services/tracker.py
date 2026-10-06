"""Database work runs in workers; no connection is held during scraping."""

import asyncio
import logging
import math
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.services.alert import create_price_drop_alert
from app.crud.price_history import get_price_history
from app.crud.product import (
    delete_product,
    get_all_products,
    get_product_by_id,
    get_product_by_url,
    update_product,
)
from app.models.price_history import PriceHistory
from app.models.product import Product
from app.services.scraper import normalize_product_url, scrape_product
from app.services.scrapers.errors import (
    ProductRemovedError,
    ScrapeUnavailableError,
)
from app.services.threshold import evaluate_threshold

logger = logging.getLogger(__name__)


# ============================================================
# CONSTANTS
# ============================================================

TRACKING_ERROR_MESSAGE = (
    "We couldn't verify this product right now. "
    "The retailer may be temporarily unavailable or blocking automated requests. "
    "Please check the URL and try again in a few moments."
)

SCRAPE_UNAVAILABLE_MESSAGE = (
    "We couldn't verify this product right now. "
    "The retailer may be temporarily unavailable or requires verification. "
    "Please try again in a few moments."
)

SCRAPE_TIMEOUT_MESSAGE = (
    "The retailer took too long to respond. " "Please try again in a few moments."
)

INVALID_PRICE_MESSAGE = (
    "We couldn't find a valid current price for this product. "
    "Please make sure the product is available and try again."
)


# ============================================================
# INTERNAL HELPERS
# ============================================================


def _find_existing(
    db: Session,
    url: str,
    user_id: int,
):
    """Find an already tracked product using its normalized URL."""

    product = get_product_by_url(
        db=db,
        url=url,
        user_id=user_id,
    )

    if product:
        return product

    # Older deployments may have stored share/tracking URLs
    # without normalization.
    for candidate in get_all_products(
        db=db,
        user_id=user_id,
    ):
        try:
            if normalize_product_url(candidate.url) == url:
                return candidate
        except ValueError:
            continue

    return None


def _existing(
    db: Session,
    url: str,
    user_id: int,
):
    """
    Read an existing product and release the database transaction
    before network I/O begins.
    """

    product = _find_existing(
        db=db,
        url=url,
        user_id=user_id,
    )

    # Detach objects before releasing the database state.
    db.expunge_all()
    db.rollback()

    return product


def _track_response(
    product: Product,
    status: str = "new",
):
    """Build the standard tracking response."""

    if status == "existing":
        message = "This product is already being tracked."
    else:
        message = "Product added successfully."

    return {
        "message": message,
        "status": status,
        "old_price": None,
        "new_price": product.price,
        "difference": None,
        "percentage": None,
        "product": product,
    }


def _validate_scraped_product(data: dict) -> float:
    """
    Validate scraper output before writing anything to the database.
    """

    if not isinstance(data, dict):
        raise ValueError("The retailer returned invalid product data.")

    name = data.get("name")

    if not isinstance(name, str) or not name.strip():
        raise ValueError("The retailer did not return a valid product name.")

    raw_price = data.get("price")

    if isinstance(raw_price, bool):
        raise ValueError("The retailer returned an invalid price.")

    try:
        price = float(raw_price)
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError("The retailer did not return a valid price.") from exc

    if not math.isfinite(price) or price <= 0:
        raise ValueError("The retailer returned an invalid price.")

    return price


def _save_new(
    db: Session,
    url: str,
    user_id: int,
    data: dict,
):
    """
    Save a newly scraped product.

    Product and initial price history are committed atomically.
    """

    existing = _find_existing(
        db=db,
        url=url,
        user_id=user_id,
    )

    if existing:
        return _track_response(
            existing,
            "existing",
        )

    price = _validate_scraped_product(data)

    now = datetime.now(timezone.utc)

    product = Product(
        name=data["name"].strip(),
        url=url,
        price=price,
        image_url=data.get("image_url"),
        user_id=user_id,
        availability=data.get(
            "availability",
            "available",
        ),
        last_checked_at=now,
        last_successful_check_at=now,
        last_check_error=None,
        removed_at=None,
    )

    try:
        db.add(product)
        db.flush()

        db.add(
            PriceHistory(
                product_id=product.id,
                price=product.price,
            )
        )

        # Product + initial price observation are atomic.
        db.commit()

        # Refresh committed values.
        db.refresh(product)

    except IntegrityError:
        db.rollback()

        # Another request/worker may have inserted the product.
        existing = _find_existing(
            db=db,
            url=url,
            user_id=user_id,
        )

        if existing:
            return _track_response(
                existing,
                "existing",
            )

        logger.exception(
            "Database integrity error while saving product: %s",
            url,
        )

        raise

    except Exception:
        db.rollback()

        logger.exception(
            "Unexpected database error while saving product: %s",
            url,
        )

        raise

    return _track_response(product)


# ============================================================
# TRACK NEW PRODUCT
# ============================================================


async def track_product(
    db: Session,
    url: str,
    user_id: int,
):
    """
    Track a new product.

    Network scraping is performed without holding a database
    transaction.
    """

    # --------------------------------------------------------
    # 1. Normalize and validate URL
    # --------------------------------------------------------

    try:
        url = normalize_product_url(url)

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    # --------------------------------------------------------
    # 2. Check whether product already exists
    # --------------------------------------------------------

    existing = await run_in_threadpool(
        _existing,
        db,
        url,
        user_id,
    )

    if existing:
        return _track_response(
            existing,
            "existing",
        )

    # --------------------------------------------------------
    # 3. Scrape retailer
    # --------------------------------------------------------

    try:
        data = await scrape_product(url)

    except ProductRemovedError as exc:
        logger.info(
            "Product was removed from retailer: %s",
            url,
        )

        raise HTTPException(
            status_code=410,
            detail=(
                "This product is no longer available " "on the retailer's website."
            ),
        ) from exc

    except ScrapeUnavailableError as exc:
        logger.warning(
            "Retailer verification failed for %s: %s",
            url,
            exc,
        )

        raise HTTPException(
            status_code=502,
            detail=SCRAPE_UNAVAILABLE_MESSAGE,
        ) from exc

    except asyncio.TimeoutError as exc:
        logger.warning(
            "Retailer request timed out for %s",
            url,
        )

        raise HTTPException(
            status_code=504,
            detail=SCRAPE_TIMEOUT_MESSAGE,
        ) from exc

    except TimeoutError as exc:
        logger.warning(
            "Retailer request timed out for %s",
            url,
        )

        raise HTTPException(
            status_code=504,
            detail=SCRAPE_TIMEOUT_MESSAGE,
        ) from exc

    except Exception as exc:
        # Keep technical traceback in server logs.
        # Do not expose internal scraper/browser details.
        logger.exception(
            "Unexpected product scrape failure for URL: %s",
            url,
        )

        raise HTTPException(
            status_code=502,
            detail=TRACKING_ERROR_MESSAGE,
        ) from exc

    # --------------------------------------------------------
    # 4. Validate scraper result
    # --------------------------------------------------------

    try:
        _validate_scraped_product(data)

    except ValueError as exc:
        logger.warning(
            "Invalid product data returned for %s: %s",
            url,
            exc,
        )

        raise HTTPException(
            status_code=502,
            detail=INVALID_PRICE_MESSAGE,
        ) from exc

    # --------------------------------------------------------
    # 5. Save product
    # --------------------------------------------------------

    try:
        return await run_in_threadpool(
            _save_new,
            db,
            url,
            user_id,
            data,
        )

    except IntegrityError as exc:
        logger.exception(
            "Could not save tracked product: %s",
            url,
        )

        raise HTTPException(
            status_code=409,
            detail=(
                "This product could not be added because it is "
                "already being tracked."
            ),
        ) from exc

    except Exception as exc:
        logger.exception(
            "Unexpected error while tracking product: %s",
            url,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "The product was found, but we couldn't save it "
                "right now. Please try again."
            ),
        ) from exc


# ============================================================
# RECORD PRICE CHECK
# ============================================================


def record_check(
    db: Session,
    product_id: int,
    data=None,
    error=None,
):
    """
    Save the result of a price check.

    A row lock prevents simultaneous manual/scheduled checks
    from overwriting one another.
    """

    product = (
        db.query(Product).filter(Product.id == product_id).with_for_update().first()
    )

    if product is None:
        return None

    now = datetime.now(timezone.utc)

    product.last_checked_at = now

    old_price = product.price

    # --------------------------------------------------------
    # Failed check
    # --------------------------------------------------------

    if error is not None:
        if isinstance(error, ProductRemovedError):
            product.availability = "removed"
            product.removed_at = product.removed_at or now
            product.last_check_error = None

            status = "removed"

        else:
            # Failed checks must never:
            # - set price to 0
            # - delete price history
            # - assume product was removed
            product.last_check_error = (
                "The retailer could not be checked. "
                "The previous price has been kept."
            )

            status = "error"

            logger.warning(
                "Price check failed for product %s: %s",
                product_id,
                type(error).__name__,
            )

        db.commit()

        return {
            "status": status,
            "product": product,
            "old_price": old_price,
            "new_price": None,
        }

    # --------------------------------------------------------
    # Validate successful result
    # --------------------------------------------------------

    try:
        price = _validate_scraped_product(data)

    except ValueError as exc:
        logger.warning(
            "Invalid price data for product %s: %s",
            product_id,
            exc,
        )

        product.last_check_error = (
            "The retailer returned an invalid price. "
            "The previous price has been kept."
        )

        db.commit()

        return {
            "status": "error",
            "product": product,
            "old_price": old_price,
            "new_price": None,
        }

    # --------------------------------------------------------
    # Successful price update
    # --------------------------------------------------------

    product.price = price

    product.availability = data.get(
        "availability",
        "available",
    )

    product.removed_at = None

    product.last_check_error = None

    product.last_successful_check_at = now

    # Every successful observation is saved.
    db.add(
        PriceHistory(
            product_id=product.id,
            price=price,
        )
    )

    # Evaluate threshold before commit.
    evaluate_threshold(
        db,
        product,
    )

    try:
        db.commit()

    except Exception:
        db.rollback()

        logger.exception(
            "Could not save price update for product %s",
            product_id,
        )

        raise

    difference = price - old_price

    percentage = difference / old_price * 100 if old_price else 0

    if difference == 0:
        status = "unchanged"
    elif difference < 0:
        status = "decreased"
    else:
        status = "increased"

    # --------------------------------------------------------
    # Price-drop notification
    # --------------------------------------------------------

    if status == "decreased":
        try:
            create_price_drop_alert(
                db,
                product,
                old_price,
                price,
                difference,
                percentage,
            )

        except Exception:
            # Price update has already been committed.
            # Notification failure must not undo it.
            db.rollback()

            logger.exception(
                "Price saved but notification failed for product %s",
                product_id,
            )

    return {
        "status": status,
        "product": product,
        "old_price": old_price,
        "new_price": price,
        "difference": difference,
        "percentage": round(
            percentage,
            2,
        ),
    }


# ============================================================
# AUTOMATIC PRICE TRACKING
# ============================================================


async def track_product_price(
    db: Session,
    product,
):
    """
    Perform a fresh price check for an existing product.

    This function is used by the scheduler.
    """

    product_id = product.id
    url = product.url

    # Release any existing DB state before network I/O.
    await run_in_threadpool(
        db.expunge_all,
    )

    await run_in_threadpool(
        db.rollback,
    )

    try:
        # fresh=True bypasses the short scraper cache.
        data = await scrape_product(
            url,
            fresh=True,
        )

    except Exception as exc:
        return await run_in_threadpool(
            record_check,
            db,
            product_id,
            error=exc,
        )

    return await run_in_threadpool(
        record_check,
        db,
        product_id,
        data=data,
    )


# ============================================================
# LIST PRODUCTS
# ============================================================


def list_products(
    db: Session,
    user_id: int,
):
    """Return all tracked products belonging to the logged-in user."""

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

    Only returns the product if it belongs to the logged-in user.
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

    Only allows the logged-in user to delete their own product.
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

    Only allows the logged-in user to update their own product.
    """

    # --------------------------------------------------------
    # Validate name
    # --------------------------------------------------------

    if not name or not name.strip():
        raise HTTPException(
            status_code=400,
            detail="Product name cannot be empty.",
        )

    # --------------------------------------------------------
    # Validate price
    # --------------------------------------------------------

    if (
        price is None
        or isinstance(price, bool)
        or not isinstance(price, (int, float))
        or not math.isfinite(price)
        or price <= 0
    ):
        raise HTTPException(
            status_code=400,
            detail="Price must be a positive number.",
        )

    # --------------------------------------------------------
    # Find product
    # --------------------------------------------------------

    product = get_product_by_id(
        db=db,
        product_id=product_id,
        user_id=user_id,
    )

    if product is None:
        return None

    # --------------------------------------------------------
    # Validate URL
    # --------------------------------------------------------

    try:
        normalized_url = normalize_product_url(
            url or product.url,
        )

        if normalized_url != normalize_product_url(product.url):
            raise ValueError(
                "A different product must be tracked separately "
                "to preserve its price history."
            )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    # --------------------------------------------------------
    # Update
    # --------------------------------------------------------

    try:
        product = update_product(
            db=db,
            product=product,
            name=name.strip(),
            url=normalized_url,
            price=price,
            image_url=image_url,
        )

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="This product URL is already being tracked.",
        ) from exc

    return {
        "message": "Product updated successfully.",
        "product": product,
    }
