from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User


# ============================================================
# GET USER BY EMAIL
# ============================================================

def get_user_by_email(
    db: Session,
    email: str,
) -> User | None:
    """
    Get a user by normalized email address.
    """

    if not email:
        return None

    normalized_email = email.strip().lower()
    if not normalized_email:
        return None

    return (
        db.query(User)
        .filter(User.email == normalized_email)
        .first()
    )


# ============================================================
# GET USER BY ID
# ============================================================

def get_user_by_id(
    db: Session,
    user_id: int,
) -> User | None:
    """
    Get a user by ID.
    """

    if user_id <= 0:
        return None

    return (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )


# ============================================================
# CREATE USER
# ============================================================

def create_user(
    db: Session,
    email: str,
    hashed_password: str,
) -> User:
    """
    Create and persist a new user.

    The caller is responsible for handling an IntegrityError
    such as a duplicate email.
    """

    normalized_email = email.strip().lower()
    clean_password = hashed_password.strip() if hashed_password else ""

    if not normalized_email or not clean_password:
        raise ValueError("Email and hashed password cannot be empty.")

    user = User(
        email=normalized_email,
        hashed_password=clean_password,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise

    return user