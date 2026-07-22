from __future__ import annotations

import httpx

from app.services.tmdb import tmdb_client


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict[str, object] | None = None) -> None:
        self.status_code = status_code
        self._payload = payload or {}
        self.request = httpx.Request("GET", "https://example.test")

    def json(self) -> dict[str, object]:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("HTTP error", request=self.request, response=self)


class _FakeClient:
    def __init__(self, responses: list[_FakeResponse], calls: list[str]) -> None:
        self._responses = responses
        self._calls = calls

    def __enter__(self) -> "_FakeClient":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None

    def get(self, url: str, params: dict[str, object] | None = None) -> _FakeResponse:
        self._calls.append(url)
        return self._responses.pop(0)


def test_tmdb_search_retries_transient_failure_then_succeeds(monkeypatch):
    tmdb_client.search_cache._store.clear()
    monkeypatch.setattr(tmdb_client, "api_key", "test-api-key")
    monkeypatch.setattr("app.services.tmdb.sleep", lambda *_args, **_kwargs: None)

    calls: list[str] = []
    responses = [
        _FakeResponse(500),
        _FakeResponse(
            200,
            {
                "page": 1,
                "total_pages": 1,
                "total_results": 1,
                "results": [
                    {
                        "id": 603,
                        "title": "The Matrix",
                        "overview": "A hacker discovers that reality is a simulation.",
                        "release_date": "1999-03-31",
                        "poster_path": "/matrix.jpg",
                        "vote_average": 8.7,
                        "genre_ids": [28, 878],
                    }
                ],
            },
        ),
    ]

    monkeypatch.setattr(
        "app.services.tmdb.httpx.Client",
        lambda timeout: _FakeClient(responses, calls),
    )

    result = tmdb_client.search_movies(query="Matrix")

    assert len(calls) == 2
    assert result["source"] == "tmdb"
    assert result["items"][0]["id"] == 603
