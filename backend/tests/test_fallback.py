from __future__ import annotations

from app.services.tmdb import tmdb_client


def test_search_and_movie_detail_fallback_to_fixture_source(client, monkeypatch):
    monkeypatch.setattr(tmdb_client, "api_key", None)

    search_response = client.get("/api/search", params={"query": "Matrix"})
    detail_response = client.get("/api/movies/603")

    assert search_response.status_code == 200
    assert search_response.json()["source"] == "fixture"
    assert search_response.json()["items"][0]["title"] == "The Matrix"

    assert detail_response.status_code == 200
    assert detail_response.json()["source"] == "fixture"
    assert detail_response.json()["title"] == "The Matrix"


def test_search_and_movie_detail_use_tmdb_source_when_api_succeeds(client, monkeypatch):
    def fake_search_movies(*, query, page=1, year=None, genre_id=None):
        return {
            "items": [
                {
                    "id": 603,
                    "title": "The Matrix",
                    "overview": "A hacker discovers that reality is a simulation.",
                    "release_date": "1999-03-31",
                    "poster_url": "https://image.tmdb.org/t/p/w500/matrix.jpg",
                    "vote_average": 8.7,
                    "genre_ids": [28, 878],
                }
            ],
            "page": page,
            "total_pages": 1,
            "total_results": 1,
            "source": "tmdb",
        }

    def fake_get_movie_details(movie_id):
        return {
            "id": movie_id,
            "title": "The Matrix",
            "overview": "A hacker discovers that reality is a simulation.",
            "release_date": "1999-03-31",
            "poster_url": "https://image.tmdb.org/t/p/w500/matrix.jpg",
            "vote_average": 8.7,
            "cast": [
                {
                    "name": "Keanu Reeves",
                    "character": "Neo",
                    "profile_url": "https://image.tmdb.org/t/p/w500/keanu.jpg",
                }
            ],
            "source": "tmdb",
        }

    monkeypatch.setattr(tmdb_client, "search_movies", fake_search_movies)
    monkeypatch.setattr(tmdb_client, "get_movie_details", fake_get_movie_details)

    search_response = client.get("/api/search", params={"query": "Matrix"})
    detail_response = client.get("/api/movies/603")

    assert search_response.status_code == 200
    assert search_response.json()["source"] == "tmdb"
    assert search_response.json()["items"][0]["id"] == 603

    assert detail_response.status_code == 200
    assert detail_response.json()["source"] == "tmdb"
    assert detail_response.json()["cast"][0]["name"] == "Keanu Reeves"
