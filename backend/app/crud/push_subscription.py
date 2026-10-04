from sqlalchemy.orm import Session

from app.models.push_subscription import PushSubscription


def get_subscription_by_endpoint(
    db: Session,
    endpoint: str,
) -> PushSubscription | None:
    """
    Find a push subscription by its browser endpoint.
    """
    return (
        db.query(PushSubscription)
        .filter(
            PushSubscription.endpoint == endpoint,
        )
        .first()
    )


def get_user_subscriptions(
    db: Session,
    user_id: int,
) -> list[PushSubscription]:
    """
    Return all push subscriptions belonging to a user.
    """
    if user_id <= 0:
        return []

    return (
        db.query(PushSubscription)
        .filter(
            PushSubscription.user_id == user_id,
        )
        .all()
    )


def create_subscription(
    db: Session,
    user_id: int,
    endpoint: str,
    p256dh: str,
    auth: str,
) -> PushSubscription:
    """
    Create or update a push subscription (upsert by endpoint).
    """
    if user_id <= 0:
        raise ValueError("user_id must be greater than zero.")

    existing = get_subscription_by_endpoint(db=db, endpoint=endpoint)

    if existing:
        if existing.user_id != user_id:
            raise PermissionError("Subscription belongs to another account.")
        existing.p256dh = p256dh
        existing.auth = auth
        db.commit()
        db.refresh(existing)
        return existing

    subscription = PushSubscription(
        user_id=user_id,
        endpoint=endpoint,
        p256dh=p256dh,
        auth=auth,
    )

    db.add(subscription)
    db.commit()
    db.refresh(subscription)

    return subscription


def delete_subscription(
    db: Session,
    subscription: PushSubscription,
) -> None:
    """
    Delete an invalid or unsubscribed push subscription.
    """
    db.delete(subscription)
    db.commit()


def delete_subscriptions_by_ids(
    db: Session,
    subscription_ids: list[int],
) -> int:
    """
    Bulk delete multiple expired push subscriptions in a single transaction.
    """
    if not subscription_ids:
        return 0

    count = (
        db.query(PushSubscription)
        .filter(PushSubscription.id.in_(subscription_ids))
        .delete(synchronize_session=False)
    )

    db.commit()
    return count