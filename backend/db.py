"""
Backward-compatibility facade for db.py.
During the migration, this file re-exports everything from the new layered modules.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from backend.infrastructure.database.connection import engine, SessionLocal, db_session, Base, get_db
from backend.infrastructure.database.models import *
from backend.services.external_image import BirdImageService
from backend.infrastructure.database.seed import *
from backend.infrastructure.database.repositories.manager import DatabaseManager

if __name__ == "__main__":
    print("Initializing database...")
    init_database()
    print("Seeding initial data...")
    seed_runways()
    seed_bird_species()
    seed_behavior_data()
    seed_translator_data()
    print("Database setup complete.")