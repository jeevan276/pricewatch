from sqlalchemy.orm import Session

from app.models.price_history import PriceHistory


def add_price_history(
    db: Session,
    product_id: int,
    price: float,
) -> PriceHistory:
    """
    Record a new price point for a product.
    """
    if product_id <= 0:
        raise ValueError("product_id must be greater than zero.")
    if price <= 0:
        raise ValueError("price must be greater than zero.")

    history = PriceHistory(
        product_id=product_id,
        price=price,
    )

    db.add(history)
    db.commit()
    db.refresh(history)

    return history


def get_price_history(
    db: Session,
    product_id: int,
    limit: int | None = None,
) -> list[PriceHistory]:
    """
    Retrieve price history records for a specific product.
    """
    if product_id <= 0:
        return []

    query = (
        db.query(PriceHistory)
        .filter(PriceHistory.product_id == product_id)
        .order_by(PriceHistory.checked_at.asc())
    )

    if limit is not None and limit > 0:
        query = query.limit(limit)

    return query.all()