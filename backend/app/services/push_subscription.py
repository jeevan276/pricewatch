import json
import os

from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from app.services.push_endpoints import validate_push_endpoint

from app.crud.push_subscription import (
    delete_subscriptions_by_ids,
    get_user_subscriptions,
)


def send_push_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    url: str | None = None,
) -> int:
    """
    Send a Web Push notification to all devices registered
    by the user.

    Returns:
        Number of successfully sent notifications.
    """
    if user_id <= 0:
        return 0

    clean_title = title.strip() if title else ""
    clean_message = message.strip() if message else ""

    if not clean_title or not clean_message:
        return 0

    vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
    vapid_claims_email = os.getenv("VAPID_CLAIMS_EMAIL")

    if not vapid_private_key:
        raise RuntimeError(
            "VAPID_PRIVATE_KEY is not configured."
        )

    if not vapid_claims_email:
        raise RuntimeError(
            "VAPID_CLAIMS_EMAIL is not configured."
        )

    subscriptions = get_user_subscriptions(
        db=db,
        user_id=user_id,
    )

    if not subscriptions:
        print(
            f"No push subscriptions found for user {user_id}."
        )
        return 0

    payload = json.dumps({
        "title": clean_title,
        "body": clean_message,
        "url": url,
    })

    vapid_claims = {"sub": vapid_claims_email}
    success_count = 0
    expired_subscription_ids: list[int] = []

    for subscription in subscriptions:
        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.p256dh,
                "auth": subscription.auth,
            },
        }

        try:
            validate_push_endpoint(subscription.endpoint)
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims=vapid_claims,
                timeout=5,
            )

            success_count += 1

            print(
                f"Push notification sent successfully "
                f"to subscription {subscription.id}."
            )

        except WebPushException as exc:
            print(
                f"Web Push failed for subscription "
                f"{subscription.id}: {exc}"
            )

            response = exc.response

            if response is not None and response.status_code in (
                404,
                410,
            ):
                print(
                    f"Marking expired subscription "
                    f"{subscription.id} for deletion."
                )
                expired_subscription_ids.append(subscription.id)

        except Exception as exc:
            print(
                f"Unexpected Web Push error for "
                f"subscription {subscription.id}: {exc}"
            )

    # Batch delete any expired subscriptions found during sending
    if expired_subscription_ids:
        deleted_count = delete_subscriptions_by_ids(
            db=db,
            subscription_ids=expired_subscription_ids,
        )
        print(f"Purged {deleted_count} expired subscription(s).")

    return success_count