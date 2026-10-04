"""Add verified product availability and check timestamps.

Revision ID: e8b90a12c401
Revises: d263d2e07c43
"""
from alembic import op
import sqlalchemy as sa

revision = 'e8b90a12c401'
down_revision = 'd263d2e07c43'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('products', sa.Column('availability', sa.String(24), nullable=False, server_default='unknown'))
    op.add_column('products', sa.Column('last_checked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('products', sa.Column('last_successful_check_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('products', sa.Column('removed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('products', sa.Column('last_check_error', sa.String(255), nullable=True))


def downgrade():
    for name in ('last_check_error', 'removed_at', 'last_successful_check_at', 'last_checked_at', 'availability'):
        op.drop_column('products', name)
