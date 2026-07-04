import asyncio
import threading
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import scoped_session, sessionmaker

import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///bird_strike_detection.db")

# PostgreSQL doesn't need check_same_thread
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_current_scope():
    try:
        loop = asyncio.get_running_loop()
        task = asyncio.current_task(loop)
        if task is not None:
            return id(task)
    except RuntimeError:
        pass
    return threading.get_ident()

db_session = scoped_session(SessionLocal, scopefunc=get_current_scope)
Base = declarative_base()

def get_db():
    db = db_session()
    try:
        yield db
    finally:
        db.close()
