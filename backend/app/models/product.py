from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, false
from sqlalchemy.orm import relationship

from app.database.database import Base


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("url", "user_id", name="uq_user_product_url"),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String,
        nullable=False,
    )

    url = Column(
        String,
        nullable=False,
        index=True,
    )

    price = Column(
        Float,
        nullable=False,
    )

    image_url = Column(
        String,
        nullable=True,
    )

    availability = Column(String(24), nullable=False, default="unknown", server_default="unknown")
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    last_successful_check_at = Column(DateTime(timezone=True), nullable=True)
    removed_at = Column(DateTime(timezone=True), nullable=True)
    last_check_error = Column(String(255), nullable=True)
    target_price = Column(Float, nullable=True)
    threshold_reached = Column(Boolean, nullable=False, default=False, server_default=false())

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user = relationship(
        "User",
        back_populates="products",
    )

    price_history = relationship(
        "PriceHistory",
        back_populates="product",
        cascade="all, delete",
    )

    alerts = relationship(
        "Alert",
        back_populates="product",
        cascade="all, delete",
    )

    threshold_emails = relationship("ThresholdEmail", cascade="all, delete-orphan", back_populates="product")
