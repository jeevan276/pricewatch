from sqlalchemy.orm import Session

from app.models.product import Product


# ============================================================
# GET ALL PRODUCTS FOR USER
# ============================================================

def get_all_products(
    db: Session,
    user_id: int,
):
    return (
        db.query(Product)
        .filter(
            Product.user_id == user_id
        )
        .order_by(Product.id.desc())
        .all()
    )


# ============================================================
# GET ALL TRACKED PRODUCTS
# Used by automatic price tracking scheduler
# ============================================================

def get_all_tracked_products(
    db: Session,
):
    return (
        db.query(Product)
        .order_by(Product.id.desc())
        .all()
    )


# ============================================================
# GET PRODUCT BY ID FOR USER
# ============================================================

def get_product_by_id(
    db: Session,
    product_id: int,
    user_id: int,
):
    return (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.user_id == user_id,
        )
        .first()
    )


# ============================================================
# GET PRODUCT BY URL FOR USER
# ============================================================

def get_product_by_url(
    db: Session,
    url: str,
    user_id: int,
):
    return (
        db.query(Product)
        .filter(
            Product.url == url,
            Product.user_id == user_id,
        )
        .first()
    )


# ============================================================
# CREATE PRODUCT
# ============================================================

def create_product(
    db: Session,
    name: str,
    url: str,
    price: float,
    user_id: int,
    image_url: str | None = None,
):
    product = Product(
        name=name,
        url=url,
        price=price,
        image_url=image_url,
        user_id=user_id,
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product


# ============================================================
# UPDATE PRODUCT
# ============================================================

def update_product(
    db: Session,
    product: Product,
    name: str | None = None,
    url: str | None = None,
    price: float | None = None,
    image_url: str | None = None,
):
    if name is not None:
        product.name = name
    if url is not None:
        product.url = url
    if price is not None:
        product.price = price
    if image_url is not None:
        product.image_url = image_url

    db.commit()

    return product


# ============================================================
# DELETE PRODUCT
# ============================================================

def delete_product(
    db: Session,
    product: Product,
):
    db.delete(product)
    db.commit()

    return True