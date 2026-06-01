"""
U-Dash Master Dashboard + LINE Notification System - FastAPI Backend
Main application entry point.

Run command: uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import create_db_and_tables, engine
from models import User
from services.seed_data import seed_all

from routers.auth import router as auth_router
from routers.dashboard import router as dashboard_router
from routers.transactions import router as transactions_router
from routers.categories import router as categories_router
from routers.settings import router as settings_router
from routers.notifications import router as notifications_router
from routers.reports import router as reports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager:
    Creates database tables if not existing, checks if database is empty,
    and runs the seed generator to load 14 days of realistic Thai business demo data.
    """
    print("Starting U-Dash Dashboard API...")
    create_db_and_tables()

    # Seed demo data if the admin user is not registered
    with Session(engine) as session:
        admin_exists = session.exec(select(User)).first()
        if not admin_exists:
            print("Database is empty. Seeding 14 days of premium demo data...")
            seed_all(session)
        else:
            print("Database already populated. Skipping data seed.")
            
        # Automatically sync LINE_NOTIFY_TOKEN env to database StoreSetting
        import os
        from models import StoreSetting
        from sqlmodel import col
        
        env_token = os.getenv("LINE_NOTIFY_TOKEN", "")
        if env_token and env_token.strip():
            db_token = session.exec(
                select(StoreSetting).where(col(StoreSetting.key) == "line_token")
            ).first()
            if db_token:
                if not db_token.value.strip():
                    db_token.value = env_token.strip()
                    session.add(db_token)
                    session.commit()
                    print("Synced empty database line_token with LINE_NOTIFY_TOKEN from environment.")
            else:
                session.add(StoreSetting(key="line_token", value=env_token.strip()))
                session.commit()
                print("Initialized database line_token with LINE_NOTIFY_TOKEN from environment.")

    print("U-Dash Dashboard Backend ready!")
    yield
    print("Shutting down U-Dash Dashboard Backend...")


# ─── FastAPI App Initialization ──────────────────────────────────────────────────

app = FastAPI(
    title="U-Dash Dashboard API",
    description="FastAPI Backend for U-Dash Business Dashboard + LINE Notify System",
    version="2.0.0",
    lifespan=lifespan,
)

import os

# Dynamic CORS configuration from environment variable
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if allowed_origins_env:
    origins.extend([o.strip() for o in allowed_origins_env.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Router Registration ─────────────────────────────────────────────────────────

app.include_router(auth_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(reports_router, prefix="/api")


# ─── Core / Healthcheck Endpoints ───────────────────────────────────────────────

@app.get("/")
def get_root():
    """API Directory endpoint."""
    return {
        "app": "U-Dash Dashboard API",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "auth": "/api/auth/me",
            "dashboard": "/api/dashboard/summary",
            "transactions": "/api/transactions",
            "categories": "/api/categories",
            "settings": "/api/settings",
            "notifications": "/api/notifications",
        },
    }


@app.get("/health")
def get_health():
    """Simple API health check endpoint."""
    return {"status": "ok"}
