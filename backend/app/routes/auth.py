from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.crud.user import (
    create_user,
    get_user_by_email,
)
from app.database.database import get_db
from app.schemas.auth import (
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)
from app.services.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ============================================================
# REGISTER
# ============================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    request: UserRegister,
    db: Session = Depends(get_db),
):
    """
    Register a new user.

    Validation responsibilities:
    - Email validation is handled by UserRegister.
    - Password strength validation is handled by UserRegister.
    - Password bcrypt byte-limit validation is handled by
      hash_password().
    - Duplicate email protection is enforced by both the
      application check and database UNIQUE constraint.
    """

    # --------------------------------------------------------
    # CHECK EXISTING USER
    # --------------------------------------------------------

    existing_user = get_user_by_email(
        db=db,
        email=str(request.email),
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        )

    # --------------------------------------------------------
    # HASH PASSWORD
    # --------------------------------------------------------

    try:
        hashed_password = hash_password(
            request.password,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # --------------------------------------------------------
    # CREATE USER
    # --------------------------------------------------------

    try:
        user = create_user(
            db=db,
            email=str(request.email),
            hashed_password=hashed_password,
        )

    except IntegrityError:
        # Handles a race condition where another request
        # registers the same email between the existence
        # check and database INSERT.
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        ) from None

    return user


# ============================================================
# LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    request: UserLogin,
    db: Session = Depends(get_db),
):
    """
    Authenticate a user and return a JWT access token.
    """

    # --------------------------------------------------------
    # FIND USER
    # --------------------------------------------------------

    user = get_user_by_email(
        db=db,
        email=str(request.email),
    )

    # --------------------------------------------------------
    # VERIFY CREDENTIALS
    # --------------------------------------------------------

    if user is None or not verify_password(
        request.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # --------------------------------------------------------
    # CREATE ACCESS TOKEN
    # --------------------------------------------------------

    access_token = create_access_token(
        user_id=user.id,
    )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )


# ============================================================
# CURRENT USER
# ============================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user=Depends(get_current_user),
):
    """
    Return the currently authenticated user.
    """

    return current_user