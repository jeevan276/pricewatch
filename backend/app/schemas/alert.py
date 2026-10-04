from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AlertResponse(BaseModel):
    id: int
    user_id: int
    product_id: int

    old_price: float
    new_price: float
    difference: float
    percentage: float

    message: str
    is_read: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    count: int
    unread_count: int


class AlertSingleResponse(BaseModel):
    alert: AlertResponse


class AlertMarkReadResponse(BaseModel):
    message: str
    alert: AlertResponse


class AlertUpdateCountResponse(BaseModel):
    message: str
    updated: int


class AlertDeleteResponse(BaseModel):
    message: str
    deleted: int