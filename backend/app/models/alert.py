from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from app.database.database import Base


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        Index("idx_user_unread_created", "user_id", "is_read", "created_at"),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    old_price = Column(
        Float,
        nullable=False,
    )

    new_price = Column(
        Float,
        nullable=False,
    )

    difference = Column(
        Float,
        nullable=False,
    )

    percentage = Column(
        Float,
        nullable=False,
    )

    message = Column(
        String,
        nullable=False,
    )

    is_read = Column(
        Integer,
        default=0,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    user = relationship(
        "User",
        back_populates="alerts",
    )

    product = relationship(
        "Product",
        back_populates="alerts",
    )