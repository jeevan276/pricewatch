from pydantic import BaseModel, EmailStr, Field, field_validator


class ContactRequest(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    email: EmailStr

    subject: str = Field(
        ...,
        min_length=3,
        max_length=200,
    )

    message: str = Field(
        ...,
        min_length=10,
        max_length=5000,
    )

    @field_validator("name", "subject", "message", mode="before")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("Field cannot be empty or contain only whitespace.")
        return value


class ContactResponse(BaseModel):
    message: str