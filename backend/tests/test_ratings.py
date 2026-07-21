from __future__ import annotations

from sqlalchemy import func, select

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.models import Rating, User


def test_rating_upsert_keeps_single_row_and_latest_score(client, db_session, monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret_key", "test-jwt-secret-key-that-is-long-enough-for-hs256")

    user = User(username="tester", password_hash=hash_password("secret123"))
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    headers = {"Authorization": f"Bearer {create_access_token(user)}"}
    payload_base = {
        "tmdb_id": 603,
        "title": "The Matrix",
        "poster_url": "https://image.tmdb.org/t/p/w500/matrix.jpg",
        "overview": "A hacker discovers that reality is a simulation.",
        "release_date": "1999-03-31",
    }

    first_response = client.post("/api/ratings", json={**payload_base, "rating": 3}, headers=headers)
    second_response = client.post("/api/ratings", json={**payload_base, "rating": 5}, headers=headers)

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert second_response.json()["rating"] == 5

    list_response = client.get("/api/ratings", headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
    assert list_response.json()[0]["rating"] == 5

    import app.db as db_module

    with db_module.SessionLocal() as session:
        row_count = session.scalar(select(func.count()).select_from(Rating).where(Rating.user_id == user.id))

    assert row_count == 1
