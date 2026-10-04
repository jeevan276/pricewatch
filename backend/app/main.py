import asyncio
import os
import sys
from contextlib import asynccontextmanager

# ============================================================
# WINDOWS ASYNCIO CONFIGURATION
# ============================================================

if sys.platform == "win32":
    asyncio.set_event_loop_policy(
        asyncio.WindowsProactorEventLoopPolicy()
    )


# ============================================================
# FASTAPI
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
# DATABASE
# ============================================================

from sqlalchemy import text

from app.database.database import (
    Base,
    engine,
)


# ============================================================
# MODELS
# ============================================================
# Import every model before create_all() so SQLAlchemy knows
# about all database tables and relationships.

from app.models import (
    Alert,
    PriceHistory,
    Product,
    PushSubscription,
    User,
)


# ============================================================
# ROUTES
# ============================================================

from app.routes import (
    alert,
    auth,
    contact,
    notification,
    product,
)


# ============================================================
# SERVICES
# ============================================================

from app.services.scheduler import (
    start_scheduler,
    stop_scheduler,
)
from app.services.scraper import close_scrapers
from app.services.browser import close_shared_browser
from starlette.concurrency import run_in_threadpool


# ============================================================
# APPLICATION LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle.
    """

    print("=" * 60)
    print("Starting PriceWatch backend...")
    print("=" * 60)

    # Local convenience only; deployed databases use the migration script.
    if os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true":
        await run_in_threadpool(Base.metadata.create_all, bind=engine)
    # Start automatic price tracking
    start_scheduler()

    try:
        yield
    finally:
        stop_scheduler()
        await close_scrapers()
        await close_shared_browser()
        await run_in_threadpool(engine.dispose)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="PriceWatch API",
    description=(
        "Price tracking platform with automatic price monitoring "
        "Web Push price-drop notifications and target-price email alerts."
    ),
    version="1.1.0",
    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

cors_origins = [
    # Production frontend
    "https://price-watch-inky.vercel.app",

    # Local development
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


# ------------------------------------------------------------
# Optional CORS URL
# ------------------------------------------------------------

extra_cors = os.getenv("CORS_URL")

if extra_cors:
    extra_cors = extra_cors.strip()

    if extra_cors and extra_cors not in cors_origins:
        cors_origins.append(extra_cors)


app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE TABLE INITIALIZATION
# ============================================================
#
# IMPORTANT:
# Alembic is the primary migration system.
#
# create_all() is kept for local development and will only
# create tables that do not already exist.
#



# ============================================================
# API ROUTES
# ============================================================

# ------------------------------------------------------------
# Authentication
# ------------------------------------------------------------

app.include_router(
    auth.router,
)


# ------------------------------------------------------------
# Product tracking
# ------------------------------------------------------------

app.include_router(
    product.router,
)


# ------------------------------------------------------------
# Web Push notifications
# ------------------------------------------------------------

app.include_router(
    notification.router,
)


# ------------------------------------------------------------
# Price alerts
# ------------------------------------------------------------

app.include_router(
    alert.router,
)


# ------------------------------------------------------------
# Contact support
# ------------------------------------------------------------

app.include_router(
    contact.router,
)


# ============================================================
# ROOT / HEALTH CHECK
# ============================================================

@app.get(
    "/",
    tags=["Health"],
)
def root():
    """
    Basic API health check.
    """

    return {
        "message": "PriceWatch API is running",
        "status": "ok",
    }


# ============================================================
# DATABASE HEALTH CHECK
# ============================================================

@app.get(
    "/db",
    tags=["Health"],
)
def database_check():
    """
    Check PostgreSQL database connectivity.
    """

    with engine.connect() as connection:

        version = connection.execute(
            text("SELECT version();")
        ).scalar()

    return {
        "message": "Database connected successfully!",
        "postgres_version": version,
    }
