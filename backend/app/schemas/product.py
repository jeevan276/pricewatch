from datetime import datetime, timezone
from typing import Annotated
from pydantic import AliasChoices, BaseModel, HttpUrl, Field, computed_field, field_validator, model_validator


# ==========================
# Request Schemas
# ==========================

class ProductTrackRequest(BaseModel):
    url: HttpUrl


class ProductThresholdRequest(BaseModel):
    target_price: Annotated[float, Field(strict=True, ge=0.01, le=10_000_000, allow_inf_nan=False)] | None

    @field_validator("target_price")
    @classmethod
    def money_precision(cls, value):
        if value is not None and round(value, 2) != value:
            raise ValueError("Use a price with at most two decimal places.")
        return value


class ProductUpdateRequest(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=255)]
    url: HttpUrl
    price: Annotated[float, Field(gt=0, le=10_000_000)]
    image_url: HttpUrl | None = None

    @field_validator("name")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty or whitespace only")
        return v


# ==========================
# Response Schemas
# ==========================

class ProductResponse(BaseModel):
    id: int
    name: str
    url: str
    price: float
    image_url: str | None = None

    availability: str = "unknown"
    last_checked_at: datetime | None = None
    last_successful_check_at: datetime | None = None
    removed_at: datetime | None = None
    last_check_error: str | None = None
    target_price: float | None = None
    threshold_reached: bool = False

    @computed_field
    @property
    def email_alerts_available(self) -> bool:
        from app.services.threshold_email import email_delivery_configured
        return email_delivery_configured()

    @field_validator("last_checked_at", "last_successful_check_at", "removed_at")
    @classmethod
    def utc_check_time(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    model_config = {
        "from_attributes": True
    }


class PriceHistoryResponse(BaseModel):
    id: int
    product_id: int
    price: float
    checked_at: datetime

    @field_validator("checked_at")
    @classmethod
    def utc_checked_at(cls, value: datetime) -> datetime:
        # Original history columns store UTC without a timezone annotation.
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

    model_config = {
        "from_attributes": True
    }


class CompareSiteResponse(BaseModel):
    site: str
    status: str
    name: str | None = None
    price: float | None = None
    url: str | None = None
    image_url: str | None = None


class TrackProductResponse(BaseModel):
    message: str
    status: str
    old_price: float | None
    new_price: float
    difference: float | None
    percentage: float | None
    product: ProductResponse


class ProductHistoryResponse(BaseModel):
    product: ProductResponse
    history: list[PriceHistoryResponse]


# ==========================
# Product Comparison
# ==========================

class ProductCompareRequest(BaseModel):
    daraz_url: HttpUrl | None = None

    onlinesaathi_url: HttpUrl | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "onlinesaathi_url",
            "onlinesathi_url",
        ),
    )

    hamrobazar_url: HttpUrl | None = None

    mychoice_url: HttpUrl | None = None

    @model_validator(mode="after")
    def valid_comparison(self):
        from urllib.parse import urlparse

        fields = {
            "daraz_url": "daraz.com.np",
            "onlinesaathi_url": "onlinesaathi.com",
            "hamrobazar_url": "hamrobazaar.com",
            "mychoice_url": "my-choice-ecom.vercel.app",
        }

        if sum(
            getattr(self, field) is not None
            for field in fields
        ) < 2:
            raise ValueError(
                "Provide at least two product URLs to compare."
            )

        for field, domain in fields.items():
            value = getattr(self, field)

            if value is None:
                continue

            parsed = urlparse(str(value))

            if (
                parsed.hostname is None
                or parsed.hostname.removeprefix("www.") != domain
                or parsed.username
                or parsed.password
                or parsed.port not in (None, 80, 443)
            ):
                raise ValueError(
                    f"{field} must contain a product URL from {domain}."
                )

        return self

class ComparisonOffer(BaseModel):
    site: str
    name: str
    price: float
    url: str
    image_url: str | None = None


class ProductCompareResponse(BaseModel):
    product: str | None
    sites: list[CompareSiteResponse]
    offers: list[CompareSiteResponse]
    cheapest: CompareSiteResponse | None
    highest: CompareSiteResponse | None
    difference: float
