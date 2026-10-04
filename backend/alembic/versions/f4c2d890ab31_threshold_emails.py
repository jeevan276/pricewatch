"""Add per-product price thresholds and durable email delivery.

Revision ID: f4c2d890ab31
Revises: e8b90a12c401
"""
from alembic import op
import sqlalchemy as sa

revision = "f4c2d890ab31"
down_revision = "e8b90a12c401"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("products", sa.Column("target_price", sa.Float(), nullable=True))
    op.add_column("products", sa.Column("threshold_reached", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_table("threshold_emails",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("delivery_key", sa.String(36), nullable=False, unique=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipient", sa.String(320), nullable=False),
        sa.Column("product_name", sa.String(), nullable=False),
        sa.Column("product_url", sa.String(), nullable=False),
        sa.Column("target_price", sa.Float(), nullable=False),
        sa.Column("reached_price", sa.Float(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lease_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("claim_token", sa.String(36), nullable=True),
        sa.Column("last_error", sa.String(255), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_threshold_email_delivery", "threshold_emails", ["status", "next_attempt_at"])


def downgrade():
    op.drop_table("threshold_emails")
    op.drop_column("products", "threshold_reached")
    op.drop_column("products", "target_price")
