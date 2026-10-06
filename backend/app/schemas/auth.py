from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)

# ============================================================
# SHARED VALIDATORS
# ============================================================


def validate_email(value):
    """
    Validate and normalize email.

    Rules:
    - Must be a string.
    - Leading/trailing whitespace is removed.
    - Email cannot be empty.
    - Uppercase letters are not allowed.
    - Email format is validated by Pydantic EmailStr.
    """
    if not isinstance(value, str):
        return value

    value = value.strip()

    if not value:
        raise ValueError("Email is required.")

    if value != value.lower():
        raise ValueError("Email must contain only lowercase letters.")

    return value


def validate_password(value: str) -> str:
    """
    Validate password for registration and login.

    Rules:
    - Must not be empty.
    - Maximum 72 UTF-8 bytes for bcrypt compatibility.
    - No leading/trailing whitespace.
    - No whitespace anywhere.
    - Must contain uppercase letter.
    - Must contain lowercase letter.
    - Must contain number.
    - Must contain special character.
    """

    if not isinstance(value, str):
        raise ValueError("Password must be a string.")

    if not value:
        raise ValueError("Password is required.")

    if len(value.encode("utf-8")) > 72:
        raise ValueError("Password must be 72 UTF-8 bytes or fewer.")

    if value != value.strip():
        raise ValueError("Password cannot start or end with whitespace.")

    if any(char.isspace() for char in value):
        raise ValueError("Password cannot contain whitespace.")

    if not any(char.isupper() for char in value):
        raise ValueError("Password must contain at least one uppercase letter.")

    if not any(char.islower() for char in value):
        raise ValueError("Password must contain at least one lowercase letter.")

    if not any(char.isdigit() for char in value):
        raise ValueError("Password must contain at least one number.")

    if not any(not char.isalnum() for char in value):
        raise ValueError("Password must contain at least one special character.")

    return value


# ============================================================
# REGISTER
# ============================================================


class UserRegister(BaseModel):
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
    def validate_register_email(cls, value):
        return validate_email(value)

    @field_validator("password")
    @classmethod
    def validate_register_password(cls, value: str) -> str:
        return validate_password(value)


# ============================================================
# LOGIN
# ============================================================


class UserLogin(BaseModel):
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
    def validate_login_email(cls, value):
        return validate_email(value)

    @field_validator("password")
    @classmethod
    def validate_login_password(cls, value: str) -> str:
        return validate_password(value)


# ============================================================
# USER RESPONSE
# ============================================================


class UserResponse(BaseModel):
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
# TOKEN RESPONSE
# ============================================================


class TokenResponse(BaseModel):
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
