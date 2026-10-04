"""Bootstrap a fresh database or upgrade the original PriceWatch schema.

Run from backend/: python scripts/migrate.py
Existing users, products and price observations are never deleted.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from app.database.database import Base, engine
from app import models


def migrate():
    config = Config(str(Path(__file__).resolve().parents[1] / 'alembic.ini'))
    config.set_main_option('script_location', str(Path(__file__).resolve().parents[1] / 'alembic'))
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    required = {'users', 'products', 'price_history'}
    if not tables.intersection(required):
        if 'alembic_version' in tables:
            raise RuntimeError('Database migration state exists but base tables are missing. Review the database before deploying.')
        Base.metadata.create_all(bind=engine)
        command.stamp(config, 'head')
        return
    if not required.issubset(tables):
        raise RuntimeError('Incomplete original schema. Restore the missing base tables before migrating.')
    if 'alembic_version' not in tables:
        # The original app used create_all without stamping Alembic.
        if {'alerts', 'push_subscriptions'}.issubset(tables):
            command.stamp(config, 'd263d2e07c43')
        elif tables.intersection({'alerts', 'push_subscriptions'}):
            raise RuntimeError('Partial notification schema. Review before migrating.')
    command.upgrade(config, 'head')


if __name__ == '__main__':
    migrate()
