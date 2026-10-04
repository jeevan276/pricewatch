from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured.")

# Reuse connections; recover stale connections after the database sleeps.
options = {"pool_pre_ping": True, "pool_recycle": 300}
if DATABASE_URL.startswith("postgresql"):
    options.update(pool_size=5, max_overflow=5, pool_timeout=10,
                   connect_args={"connect_timeout": 10})
engine = create_engine(DATABASE_URL, **options)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
