import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, Session, create_engine

load_dotenv()

# Read DATABASE_URL from .env file, fall back to SQLite if not set or empty
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or not DATABASE_URL.strip():
    DATABASE_URL = "sqlite:///dashboard.db"

# Engine configuration supporting both SQLite (with special threading config) and PostgreSQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(DATABASE_URL, echo=False)


def create_db_and_tables():
    """Create all database tables from SQLModel schema metadata."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Yield a database session context for FastAPI dependencies."""
    with Session(engine) as session:
        yield session
