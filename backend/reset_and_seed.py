import sys
import os

# Append current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import Session, SQLModel
from database import engine, create_db_and_tables
from services.seed_data import seed_all

def reset_and_seed():
    print("Dropping all existing database tables...")
    SQLModel.metadata.drop_all(engine)
    
    print("Creating all tables from scratch...")
    create_db_and_tables()
    
    print("Seeding database with BrewLab Cafe (BrewLab) data...")
    with Session(engine) as session:
        seed_all(session)
        
    print("Database reset and seed complete!")

if __name__ == "__main__":
    reset_and_seed()
