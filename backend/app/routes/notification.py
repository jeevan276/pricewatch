from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.crud.push_subscription import (
    create_subscription,
    delete_subscription,
    get_subscription_by_endpoint,
    get_user_subscriptions,
)
from app.database.database import get_db
from app.schemas.push import PushSubscriptionCreate, PushSubscriptionResponse
from app.services.auth import get_current_user


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# ============================================================
# GET VAPID PUBLIC KEY
# ============================================================

@router.get("/public-key")
def get_public_key():
    """
    Return the VAPID public key to the frontend.

    The public key is safe to expose.
    The VAPID private key must NEVER be returned.
    """

    import os

    public_key = os.getenv("VAPID_PUBLIC_KEY")

    if not public_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="VAPID public key is not configured.",
        )

    return {
        "public_key": public_key,
    }


# ============================================================
# SUBSCRIBE TO WEB PUSH
# ============================================================

@router.post(
    "/subscribe",
    status_code=status.HTTP_201_CREATED,
)
def subscribe_to_push(
    request: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Save the browser's Web Push subscription.

    Each subscription belongs to the authenticated user.
    """

    # Pydantic HttpUrl is not a DB-adaptable scalar; serialize before lookup/save.
    endpoint = str(request.endpoint)
    try:
        create_subscription(db, current_user.id, endpoint, request.keys.p256dh, request.keys.auth)
    except PermissionError as exc:
        db.rollback()
        raise HTTPException(409, "This browser subscription belongs to another account. Create a new subscription.") from exc
    except IntegrityError as exc:
        db.rollback()
        # A concurrent subscribe may have inserted the same endpoint.
        try:
            create_subscription(db, current_user.id, endpoint, request.keys.p256dh, request.keys.auth)
        except (PermissionError, IntegrityError) as retry_exc:
            db.rollback()
            raise HTTPException(409, "Subscription registration changed. Please try again.") from retry_exc
    return {"message": "Push subscription saved successfully."}


# ============================================================
# LIST USER SUBSCRIPTIONS
# ============================================================

@router.get("/subscriptions")
def get_my_subscriptions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Return the current user's registered push subscriptions.
    """

    subscriptions = get_user_subscriptions(
        db=db,
        user_id=current_user.id,
    )

    return {
        "subscriptions": [PushSubscriptionResponse.model_validate(item) for item in subscriptions],
    }


# ============================================================
# UNSUBSCRIBE
# ============================================================

@router.delete("/unsubscribe")
def unsubscribe_from_push(
    endpoint: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Remove one push subscription.

    Only the owner of the subscription can remove it.
    """

    clean_endpoint = endpoint.strip() if endpoint else ""
    if not clean_endpoint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Endpoint parameter cannot be empty.",
        )

    subscription = get_subscription_by_endpoint(
        db=db,
        endpoint=clean_endpoint,
    )

    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Push subscription not found.",
        )

    if subscription.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this push subscription.",
        )

    delete_subscription(
        db=db,
        subscription=subscription,
    )

    return {
        "message": "Push subscription removed successfully.",
    }