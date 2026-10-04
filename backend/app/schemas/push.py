from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class PushSubscriptionKeys(BaseModel):
    """
    Encryption keys provided by the browser's Push API.
    """

    p256dh: str = Field(..., min_length=1)
    auth: str = Field(..., min_length=1)


class PushSubscriptionCreate(BaseModel):
    """
    Web Push subscription sent by the frontend.
    """

    endpoint: HttpUrl
    keys: PushSubscriptionKeys

    @field_validator("endpoint")
    @classmethod
    def supported_push_service(cls, value: HttpUrl) -> HttpUrl:
        from app.services.push_endpoints import validate_push_endpoint
        validate_push_endpoint(str(value))
        return value


class PushSubscriptionResponse(BaseModel):
    """
    Push subscription returned by the API.
    """

    id: int
    endpoint: str
    p256dh: str
    auth: str

    model_config = ConfigDict(
        from_attributes=True,
    )