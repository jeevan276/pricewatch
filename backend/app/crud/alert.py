from sqlalchemy.orm import Session

from app.models.alert import Alert


# ============================================================
# CREATE ALERT
# ============================================================

def create_alert(
    db: Session,
    user_id: int,
    product_id: int,
    old_price: float,
    new_price: float,
    difference: float,
    percentage: float,
    message: str,
) -> Alert:
    alert = Alert(
        user_id=user_id,
        product_id=product_id,
        old_price=old_price,
        new_price=new_price,
        difference=difference,
        percentage=percentage,
        message=message,
        is_read=0,
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    return alert


# ============================================================
# GET ALERT BY ID
# ============================================================

def get_alert_by_id(
    db: Session,
    alert_id: int,
    user_id: int,
) -> Alert | None:
    return (
        db.query(Alert)
        .filter(
            Alert.id == alert_id,
            Alert.user_id == user_id,
        )
        .first()
    )


# ============================================================
# GET USER ALERTS
# ============================================================

def get_user_alerts(
    db: Session,
    user_id: int,
    unread_only: bool = False,
) -> list[Alert]:
    query = (
        db.query(Alert)
        .filter(Alert.user_id == user_id)
    )

    if unread_only:
        query = query.filter(Alert.is_read == 0)

    return (
        query
        .order_by(Alert.created_at.desc())
        .all()
    )


# ============================================================
# MARK ALERT AS READ
# ============================================================

def mark_alert_as_read(
    db: Session,
    alert: Alert,
) -> Alert:
    alert.is_read = 1
    db.commit()
    return alert


# ============================================================
# MARK ALL ALERTS AS READ
# ============================================================

def mark_all_alerts_as_read(
    db: Session,
    user_id: int,
) -> int:
    count = (
        db.query(Alert)
        .filter(
            Alert.user_id == user_id,
            Alert.is_read == 0,
        )
        .update(
            {"is_read": 1},
            synchronize_session=False,
        )
    )

    db.commit()
    return count


# ============================================================
# DELETE ALERT
# ============================================================

def delete_alert(
    db: Session,
    alert: Alert,
) -> None:
    db.delete(alert)
    db.commit()


# ============================================================
# DELETE ALL USER ALERTS
# ============================================================

def delete_all_user_alerts(
    db: Session,
    user_id: int,
) -> int:
    count = (
        db.query(Alert)
        .filter(Alert.user_id == user_id)
        .delete(synchronize_session=False)
    )

    db.commit()
    return count