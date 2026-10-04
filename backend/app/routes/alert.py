from datetime import timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.crud.alert import (
    delete_alert,
    delete_all_user_alerts,
    get_alert_by_id,
    get_user_alerts,
    mark_alert_as_read,
    mark_all_alerts_as_read,
)
from app.database.database import get_db
from app.schemas.alert import (
    AlertDeleteResponse,
    AlertListResponse,
    AlertMarkReadResponse,
    AlertResponse,
    AlertSingleResponse,
    AlertUpdateCountResponse,
)
from app.services.auth import get_current_user


router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"],
)


# ============================================================
# TIMEZONE
# ============================================================

NEPAL_TIMEZONE = ZoneInfo("Asia/Kathmandu")


def convert_to_nepal_time(alert: AlertResponse) -> AlertResponse:
    """
    Convert an alert's created_at timestamp from UTC
    to Nepal time (Asia/Kathmandu).
    """
    if alert.created_at is None:
        return alert

    created_at = alert.created_at

    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    alert.created_at = created_at.astimezone(NEPAL_TIMEZONE)
    return alert


def convert_alerts_to_nepal_time(alerts: list) -> list:
    """
    Convert a list of alerts to Nepal time.
    """
    return [
        convert_to_nepal_time(
            AlertResponse.model_validate(alert)
        )
        for alert in alerts
    ]


# ============================================================
# GET ALL ALERTS
# ============================================================

@router.get(
    "/",
    response_model=AlertListResponse,
    status_code=status.HTTP_200_OK,
)
def get_alerts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    alerts = get_user_alerts(
        db=db,
        user_id=current_user.id,
    )

    formatted_alerts = convert_alerts_to_nepal_time(alerts)

    return {
        "alerts": formatted_alerts,
        "count": len(formatted_alerts),
        "unread_count": sum(alert.is_read == 0 for alert in formatted_alerts),
    }


# ============================================================
# GET UNREAD ALERTS
# ============================================================

@router.get(
    "/unread",
    response_model=AlertListResponse,
    status_code=status.HTTP_200_OK,
)
def get_unread_alerts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    alerts = get_user_alerts(
        db=db,
        user_id=current_user.id,
        unread_only=True,
    )

    formatted_alerts = convert_alerts_to_nepal_time(alerts)

    return {
        "alerts": formatted_alerts,
        "count": len(formatted_alerts),
        "unread_count": sum(alert.is_read == 0 for alert in formatted_alerts),
    }


# ============================================================
# GET ALERT BY ID
# ============================================================

@router.get(
    "/{alert_id}",
    response_model=AlertSingleResponse,
    status_code=status.HTTP_200_OK,
)
def get_alert(
    alert_id: int = Path(..., gt=0, description="The ID of the alert"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    alert = get_alert_by_id(
        db=db,
        alert_id=alert_id,
        user_id=current_user.id,
    )

    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found.",
        )

    alert_dto = convert_to_nepal_time(
        AlertResponse.model_validate(alert)
    )

    return {
        "alert": alert_dto,
    }


# ============================================================
# MARK ALERT AS READ
# ============================================================

@router.patch(
    "/{alert_id}/read",
    response_model=AlertMarkReadResponse,
    status_code=status.HTTP_200_OK,
)
def mark_read(
    alert_id: int = Path(..., gt=0, description="The ID of the alert"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    alert = get_alert_by_id(
        db=db,
        alert_id=alert_id,
        user_id=current_user.id,
    )

    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found.",
        )

    updated_alert = mark_alert_as_read(
        db=db,
        alert=alert,
    )

    alert_dto = convert_to_nepal_time(
        AlertResponse.model_validate(updated_alert)
    )

    return {
        "message": "Alert marked as read.",
        "alert": alert_dto,
    }


# ============================================================
# MARK ALL ALERTS AS READ
# ============================================================

@router.patch(
    "/read-all",
    response_model=AlertUpdateCountResponse,
    status_code=status.HTTP_200_OK,
)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    count = mark_all_alerts_as_read(
        db=db,
        user_id=current_user.id,
    )

    return {
        "message": "All alerts marked as read.",
        "updated": count,
    }


# ============================================================
# DELETE ALERT
# ============================================================

@router.delete(
    "/{alert_id}",
    response_model=AlertDeleteResponse,
    status_code=status.HTTP_200_OK,
)
def remove_alert(
    alert_id: int = Path(..., gt=0, description="The ID of the alert"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    alert = get_alert_by_id(
        db=db,
        alert_id=alert_id,
        user_id=current_user.id,
    )

    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found.",
        )

    delete_alert(
        db=db,
        alert=alert,
    )

    return {
        "message": "Alert deleted successfully.",
        "deleted": 1,
    }


# ============================================================
# DELETE ALL ALERTS
# ============================================================

@router.delete(
    "/",
    response_model=AlertDeleteResponse,
    status_code=status.HTTP_200_OK,
)
def remove_all_alerts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    count = delete_all_user_alerts(
        db=db,
        user_id=current_user.id,
    )

    return {
        "message": "All alerts deleted successfully.",
        "deleted": count,
    }