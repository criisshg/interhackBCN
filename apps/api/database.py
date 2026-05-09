from __future__ import annotations

import os
from functools import lru_cache
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import Engine
from dotenv import load_dotenv
from sqlmodel import Session, SQLModel, create_engine


DEFAULT_DATABASE_URL = "sqlite:///./pulse.db"
API_DIR = Path(__file__).resolve().parent

load_dotenv(API_DIR.parent.parent / ".env")
load_dotenv(API_DIR / ".env")


@lru_cache
def get_engine() -> Engine:
    database_url = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(database_url, connect_args=connect_args)


def init_db() -> None:
    SQLModel.metadata.create_all(get_engine())


def get_session() -> Generator[Session, None, None]:
    with Session(get_engine()) as session:
        yield session
