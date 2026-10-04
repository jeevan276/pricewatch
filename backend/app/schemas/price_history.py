from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PriceHistoryResponse(BaseModel):
    id: int
    product_id: int
    price: float
    checked_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class PriceHistoryListResponse(BaseModel):
    history: list[PriceHistoryResponse]
    count: int