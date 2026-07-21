from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.services.tmdb import tmdb_client  # noqa: E402


@pytest.fixture(autouse=True)
def clear_tmdb_caches() -> None:
    tmdb_client.search_cache._store.clear()
    tmdb_client.detail_cache._store.clear()
    yield
    tmdb_client.search_cache._store.clear()
    tmdb_client.detail_cache._store.clear()


@pytest.fixture
def test_engine(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
        future=True,
    )
    test_session_factory = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        future=True,
    )

    import app.db as db_module
    import app.main as main_module

    monkeypatch.setattr(db_module, "engine", engine)
    monkeypatch.setattr(db_module, "SessionLocal", test_session_factory)
    monkeypatch.setattr(main_module, "engine", engine)

    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture
def db_session(test_engine):
    import app.db as db_module

    session = db_module.SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(test_engine):
    with TestClient(app) as test_client:
        yield test_client
