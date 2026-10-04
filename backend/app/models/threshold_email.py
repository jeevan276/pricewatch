from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from app.database.database import Base


class ThresholdEmail(Base):
    """Durable notification snapshot; queued atomically with a price observation."""
    __tablename__ = "threshold_emails"
    __table_args__ = (Index("ix_threshold_email_delivery", "status", "next_attempt_at"),)

    id = Column(Integer, primary_key=True)
    delivery_key = Column(String(36), nullable=False, unique=True, default=lambda: str(uuid4()))
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    recipient = Column(String(320), nullable=False)
    product_name = Column(String, nullable=False)
    product_url = Column(String, nullable=False)
    target_price = Column(Float, nullable=False)
    reached_price = Column(Float, nullable=False)
    status = Column(String(16), nullable=False, default="pending", server_default="pending")
    attempts = Column(Integer, nullable=False, default=0, server_default="0")
    next_attempt_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    lease_until = Column(DateTime(timezone=True), nullable=True)
    claim_token = Column(String(36), nullable=True)
    last_error = Column(String(255), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    product = relationship("Product", back_populates="threshold_emails")
