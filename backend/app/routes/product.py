from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.database.database import get_db
from app.models.user import User
from app.services.auth import get_current_user

from app.schemas.product import (
    ProductTrackRequest,
    ProductThresholdRequest,
    ProductUpdateRequest,
    ProductResponse,
    TrackProductResponse,
    ProductHistoryResponse,
    ProductCompareRequest,
    ProductCompareResponse,
)

from app.services.tracker import (
    track_product,
    list_products,
    product_history,
    remove_product,
    edit_product,
    track_product_price,
)

from app.services.comparator import compare_product_urls
from app.services.threshold import set_product_threshold


router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


# =========================================================
# TRACK PRODUCT
# =========================================================

@router.post(
    "/track",
    response_model=TrackProductResponse,
    status_code=status.HTTP_200_OK,
)
async def track(
    request: ProductTrackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    # Authentication used this session; release its read transaction before I/O.
    await run_in_threadpool(db.expunge_all)
    await run_in_threadpool(db.rollback)
    return await track_product(
        db=db,
        url=str(request.url),
        user_id=user_id,
    )


# =========================================================
# GET ALL PRODUCTS FOR CURRENT USER
# =========================================================

@router.get(
    "/",
    response_model=list[ProductResponse],
)
def get_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_products(
        db=db,
        user_id=current_user.id,
    )


# =========================================================
# COMPARE PRODUCT PRICES
# =========================================================

@router.post(
    "/compare",
    response_model=ProductCompareResponse,
)
async def compare_products(
    request: ProductCompareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    await run_in_threadpool(db.expunge_all)
    await run_in_threadpool(db.rollback)
    try:
        return await compare_product_urls(
            urls={
                "Daraz": str(request.daraz_url) if request.daraz_url else None,
                "OnlineSaathi": str(request.onlinesaathi_url) if request.onlinesaathi_url else None,
                "HamroBazar": str(request.hamrobazar_url) if request.hamrobazar_url else None,
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to compare products: {str(e)}",
        ) from e


# =========================================================
# GET PRODUCT HISTORY
# =========================================================

@router.get(
    "/{product_id}/history",
    response_model=ProductHistoryResponse,
)
def get_history(
    product_id: int = Path(..., gt=0, description="The ID of the product"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = product_history(
        db=db,
        product_id=product_id,
        user_id=current_user.id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    return result


# =========================================================
# CHECK PRODUCT NOW
# =========================================================

@router.post("/{product_id}/check", response_model=ProductHistoryResponse)
async def check_product_route(
    product_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    result = await run_in_threadpool(product_history, db, product_id, user_id)
    if result is None:
        raise HTTPException(404, "Product not found.")
    await track_product_price(db, result["product"])
    result = await run_in_threadpool(product_history, db, product_id, user_id)
    if result is None:
        raise HTTPException(404, "Product not found.")
    return result


# =========================================================
# SET OR REMOVE A PRODUCT'S EMAIL PRICE THRESHOLD
# =========================================================

@router.patch("/{product_id}/threshold", response_model=ProductResponse)
def update_threshold_route(
    request: ProductThresholdRequest,
    product_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return set_product_threshold(db, product_id, current_user.id, request.target_price)


# =========================================================
# UPDATE PRODUCT
# =========================================================

@router.put(
    "/{product_id}",
    response_model=ProductResponse,
)
def update_product_route(
    request: ProductUpdateRequest,
    product_id: int = Path(..., gt=0, description="The ID of the product"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = edit_product(
        db=db,
        product_id=product_id,
        name=request.name,
        url=str(request.url),
        price=request.price,
        image_url=str(request.image_url) if request.image_url else None,
        user_id=current_user.id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    return result


# =========================================================
# DELETE PRODUCT
# =========================================================

@router.delete(
    "/{product_id}",
    status_code=status.HTTP_200_OK,
)
def delete_product_route(
    product_id: int = Path(..., gt=0, description="The ID of the product"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = remove_product(
        db=db,
        product_id=product_id,
        user_id=current_user.id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )

    return {"message": "Product deleted successfully."}
