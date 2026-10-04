from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


# ============================================================
# REGISTER
# ============================================================

class UserRegister(BaseModel):
    """
    Request schema for user registration.
    """

    email: EmailStr = Field(
        ...,
        max_length=320,
    )

    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        """
        Normalize the email before Pydantic validates it.
        """

        if not isinstance(value, str):
            return value

        return value.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        """
        Enforce strong password requirements.
        """

        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 UTF-8 bytes or fewer.")

        if not value:
            raise ValueError(
                "Password is required."
            )

        if value != value.strip():
            raise ValueError(
                "Password cannot start or end with whitespace."
            )

        if any(char.isspace() for char in value):
            raise ValueError(
                "Password cannot contain whitespace."
            )

        if not any(char.isupper() for char in value):
            raise ValueError(
                "Password must contain at least one uppercase letter."
            )

        if not any(char.islower() for char in value):
            raise ValueError(
                "Password must contain at least one lowercase letter."
            )

        if not any(char.isdigit() for char in value):
            raise ValueError(
                "Password must contain at least one number."
            )

        if not any(not char.isalnum() for char in value):
            raise ValueError(
                "Password must contain at least one special character."
            )

        return value


# ============================================================
# LOGIN
# ============================================================

class UserLogin(BaseModel):
    """
    Request schema for user login.
    """

    email: EmailStr = Field(
        ...,
        max_length=320,
    )

    password: str = Field(
        ...,
        min_length=1,
        max_length=128,
    )

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        """
        Normalize the email before Pydantic validates it.
        """

        if not isinstance(value, str):
            return value

        return value.strip().lower()


# ============================================================
# USER RESPONSE
# ============================================================

class UserResponse(BaseModel):
    """
    Public user representation.

    hashed_password is intentionally not included.
    """

    id: int = Field(
        ...,
        gt=0,
    )

    email: EmailStr = Field(
        ...,
        max_length=320,
    )

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


# ============================================================
# LOGIN RESPONSE
# ============================================================

class TokenResponse(BaseModel):
    """
    Authentication response containing JWT and user.
    """

    access_token: str = Field(
        ...,
        min_length=1,
        max_length=4096,
    )

    token_type: str = Field(
        ...,
        min_length=1,
        max_length=32,
    )

    user: UserResponse