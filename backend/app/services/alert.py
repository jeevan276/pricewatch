from sqlalchemy.orm import Session

from app.crud.alert import create_alert
from app.services.push_subscription import (
    send_push_notification,
)


def create_price_drop_alert(
    db: Session,
    product,
    old_price: float,
    new_price: float,
    difference: float,
    percentage: float,
):
    if old_price <= 0 or new_price <= 0:
        raise ValueError("Prices must be greater than zero.")

    saved_difference = abs(difference)

    message = (
        f"{product.name} price dropped by "
        f"Rs. {saved_difference:,.2f}. "
        f"Now Rs. {new_price:,.2f}."
    )

    # --------------------------------------------------------
    # SAVE ALERT
    # --------------------------------------------------------

    alert = create_alert(
        db=db,
        user_id=product.user_id,
        product_id=product.id,
        old_price=old_price,
        new_price=new_price,
        difference=saved_difference,
        percentage=abs(percentage),
        message=message,
    )

    # --------------------------------------------------------
    # SEND PUSH
    # --------------------------------------------------------

    try:
        sent_count = send_push_notification(
            db=db,
            user_id=product.user_id,
            title="Price Drop!",
            message=message,
            url=f"/product/{product.id}",
        )

        print(
            f"Price-drop notification sent to "
            f"{sent_count} device(s)."
        )

    except Exception as exc:
        print(
            f"Push notification failed: {exc}"
        )

    return alert