from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from app.database.database import Base


class User(Base):
    __tablename__ = "users"

    # ========================================================
    # TABLE CONSTRAINTS
    # ========================================================

    __table_args__ = (
        CheckConstraint(
            "length(email) >= 3",
            name="ck_users_email_min_length",
        ),
        CheckConstraint(
            "length(email) <= 320",
            name="ck_users_email_max_length",
        ),
        CheckConstraint(
            "length(hashed_password) > 0",
            name="ck_users_hashed_password_not_empty",
        ),
    )

    # ========================================================
    # ID
    # ========================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ========================================================
    # EMAIL
    # ========================================================

    email = Column(
        String(320),
        unique=True,
        nullable=False,
        index=True,
    )

    # ========================================================
    # PASSWORD HASH
    # ========================================================

    hashed_password = Column(
        String(255),
        nullable=False,
    )

    # ========================================================
    # CREATED AT
    # ========================================================

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ========================================================
    # PRODUCTS
    # ========================================================

    products = relationship(
        "Product",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # PUSH SUBSCRIPTIONS
    # ========================================================

    push_subscriptions = relationship(
        "PushSubscription",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # ALERTS
    # ========================================================

    alerts = relationship(
        "Alert",
        back_populates="user",
        cascade="all, delete-orphan",
    )