"""add web push alerts

Revision ID: d263d2e07c43
Revises:
Create Date: 2026-08-29 11:58:19.024411

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d263d2e07c43"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create Web Push subscription and alert tables."""

    # ============================================================
    # PUSH SUBSCRIPTIONS
    # ============================================================

    op.create_table(
        "push_subscriptions",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "endpoint",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "p256dh",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "auth",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),

        sa.UniqueConstraint(
            "endpoint",
        ),
    )

    op.create_index(
        "ix_push_subscriptions_id",
        "push_subscriptions",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_push_subscriptions_user_id",
        "push_subscriptions",
        ["user_id"],
        unique=False,
    )

    # ============================================================
    # ALERTS
    # ============================================================

    op.create_table(
        "alerts",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "product_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "old_price",
            sa.Float(),
            nullable=False,
        ),

        sa.Column(
            "new_price",
            sa.Float(),
            nullable=False,
        ),

        sa.Column(
            "difference",
            sa.Float(),
            nullable=False,
        ),

        sa.Column(
            "percentage",
            sa.Float(),
            nullable=False,
        ),

        sa.Column(
            "message",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "is_read",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            ondelete="CASCADE",
        ),
    )

    op.create_index(
        "ix_alerts_id",
        "alerts",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_alerts_user_id",
        "alerts",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        "ix_alerts_product_id",
        "alerts",
        ["product_id"],
        unique=False,
    )

    op.create_index(
        "ix_alerts_created_at",
        "alerts",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Remove Web Push subscription and alert tables."""

    # Alerts first because it references products/users.
    op.drop_index(
        "ix_alerts_created_at",
        table_name="alerts",
    )

    op.drop_index(
        "ix_alerts_product_id",
        table_name="alerts",
    )

    op.drop_index(
        "ix_alerts_user_id",
        table_name="alerts",
    )

    op.drop_index(
        "ix_alerts_id",
        table_name="alerts",
    )

    op.drop_table("alerts")

    # Push subscriptions.
    op.drop_index(
        "ix_push_subscriptions_user_id",
        table_name="push_subscriptions",
    )

    op.drop_index(
        "ix_push_subscriptions_id",
        table_name="push_subscriptions",
    )

    op.drop_table("push_subscriptions")