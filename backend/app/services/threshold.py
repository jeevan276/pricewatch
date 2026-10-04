"""Threshold state changes share the product price transaction."""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.threshold_email import ThresholdEmail


def set_product_threshold(db: Session, product_id: int, user_id: int, target_price: float | None):
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == user_id).with_for_update().first()
    if product is None:
        raise HTTPException(404, "Product not found.")
    if product.target_price != target_price:
        product.target_price = target_price
        product.threshold_reached = False
        # Editing/removing a target cancels unsent alerts for the old target.
        db.query(ThresholdEmail).filter(ThresholdEmail.product_id == product_id,
            ThresholdEmail.status.in_(["pending", "sending"])).update(
                {"status": "cancelled", "claim_token": None, "lease_until": None}, synchronize_session="fetch")
    db.commit()
    return product


def evaluate_threshold(db: Session, product: Product):
    """Call with the product locked; caller commits observation + event together."""
    if product.target_price is None:
        return
    if product.price > product.target_price:
        product.threshold_reached = False
        return
    if product.threshold_reached or product.availability != "available":
        return
    product.threshold_reached = True
    db.add(ThresholdEmail(product_id=product.id, recipient=product.user.email,
        product_name=product.name, product_url=product.url,
        target_price=product.target_price, reached_price=product.price))
