from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict
from dataclasses import dataclass
from math import ceil
from threading import RLock
from time import monotonic
from typing import Any

import httpx

from app.core.config import settings
from app.fixtures import get_movie as get_fixture_movie
from app.fixtures import paginate_movies as paginate_fixture_movies


class MovieNotFoundError(Exception):
    pass


@dataclass
class _CacheEntry:
    value: Any
    expires_at: float


class _TTLCache:
    def __init__(self, ttl_seconds: int, max_entries: int) -> None:
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self._store: dict[Any, _CacheEntry] = {}
        self._lock = RLock()

    def get(self, key: Any) -> Any | None:
        now = monotonic()
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None

            if entry.expires_at <= now:
                self._store.pop(key, None)
                return None

            return deepcopy(entry.value)

    def set(self, key: Any, value: Any) -> None:
        now = monotonic()
        with self._lock:
            self._prune_expired(now)
            if len(self._store) >= self.max_entries:
                oldest_key = next(iter(self._store), None)
                if oldest_key is not None:
                    self._store.pop(oldest_key, None)

            self._store[key] = _CacheEntry(value=deepcopy(value), expires_at=now + self.ttl_seconds)

    def _prune_expired(self, now: float) -> None:
        stale_keys = [key for key, entry in self._store.items() if entry.expires_at <= now]
        for key in stale_keys:
            self._store.pop(key, None)


class TmdbClient:
    def __init__(self) -> None:
        self.api_key = settings.tmdb_api_key
        self.base_url = settings.tmdb_base_url.rstrip("/")
        self.image_base_url = settings.tmdb_image_base_url.rstrip("/")
        self.language = settings.tmdb_language
        self.timeout = settings.tmdb_timeout
        self.search_cache = _TTLCache(settings.tmdb_cache_ttl_seconds, settings.tmdb_cache_max_entries)
        self.detail_cache = _TTLCache(settings.tmdb_cache_ttl_seconds, settings.tmdb_cache_max_entries)

    @property
    def use_live_api(self) -> bool:
        return bool(self.api_key)

    def search_movies(
        self,
        query: str,
        page: int = 1,
        year: int | None = None,
        genre_id: int | None = None,
    ) -> dict[str, Any]:
        query = query.strip()
        cache_key = ("search", query, page, year, genre_id, self.use_live_api)
        cached = self.search_cache.get(cache_key)
        if cached is not None:
            return cached

        if not self.use_live_api:
            payload = paginate_fixture_movies(query, page, year=year, genre_id=genre_id)
            result = {
                "items": [self._fixture_summary(movie) for movie in payload["items"]],
                "page": payload["page"],
                "total_pages": payload["total_pages"],
                "total_results": payload["total_results"],
            }
            self.search_cache.set(cache_key, result)
            return deepcopy(result)

        endpoint = "/search/movie" if query else "/discover/movie"
        params: dict[str, Any] = {
            "language": self.language,
            "page": page,
            "include_adult": "false",
            "api_key": self.api_key,
        }
        if query:
            params["query"] = query
            if year is not None:
                params["primary_release_year"] = year
        else:
            if year is not None:
                params["primary_release_year"] = year
            if genre_id is not None:
                params["with_genres"] = genre_id

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(f"{self.base_url}{endpoint}", params=params)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError:
            payload = paginate_fixture_movies(query, page, year=year, genre_id=genre_id)
            result = {
                "items": [self._fixture_summary(movie) for movie in payload["items"]],
                "page": payload["page"],
                "total_pages": payload["total_pages"],
                "total_results": payload["total_results"],
            }
            self.search_cache.set(cache_key, result)
            return deepcopy(result)

        items = [self._normalize_movie(item) for item in data.get("results", [])]
        if genre_id is not None and query:
            # O TMDB não oferece gênero + busca textual com paginação coerente no mesmo endpoint.
            # Mantemos o que foi efetivamente retornado nesta página para não exibir contagens falsas.
            items = [item for item in items if genre_id in item.get("genre_ids", [])]
            total_results = len(items)
            total_pages = max(1, ceil(total_results / 20))
            result = {
                "items": items,
                "page": min(page, total_pages),
                "total_pages": total_pages,
                "total_results": total_results,
            }
            self.search_cache.set(cache_key, result)
            return deepcopy(result)
        if year is not None and query:
            items = [
                item
                for item in items
                if (item.get("release_date") or item.get("first_air_date") or "").startswith(str(year))
            ]
        result = {
            "items": items,
            "page": data.get("page", page),
            "total_pages": data.get("total_pages", 1),
            "total_results": data.get("total_results", len(items)),
        }
        self.search_cache.set(cache_key, result)
        return deepcopy(result)

    def get_movie_details(self, movie_id: int) -> dict[str, Any]:
        cache_key = ("movie", movie_id, self.use_live_api)
        cached = self.detail_cache.get(cache_key)
        if cached is not None:
            return cached

        if not self.use_live_api:
            movie = get_fixture_movie(movie_id)
            if movie is None:
                raise MovieNotFoundError(f"Filme {movie_id} não encontrado nos dados locais.")
            result = self._fixture_detail(movie)
            self.detail_cache.set(cache_key, result)
            return deepcopy(result)

        params = {
            "language": self.language,
            "append_to_response": "credits",
            "api_key": self.api_key,
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(f"{self.base_url}/movie/{movie_id}", params=params)
                if response.status_code == 404:
                    raise MovieNotFoundError(f"Filme {movie_id} não encontrado.")
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError:
            movie = get_fixture_movie(movie_id)
            if movie is None:
                raise MovieNotFoundError(f"Filme {movie_id} não encontrado nos dados locais.")
            result = self._fixture_detail(movie)
            self.detail_cache.set(cache_key, result)
            return deepcopy(result)

        result = self._normalize_detail(data)
        self.detail_cache.set(cache_key, result)
        return deepcopy(result)

    def _image_url(self, poster_path: str | None) -> str | None:
        if not poster_path:
            return None
        if poster_path.startswith("http"):
            return poster_path
        return f"{self.image_base_url}{poster_path}"

    def _normalize_movie(self, item: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": item["id"],
            "title": item.get("title") or item.get("name") or "Sem título",
            "overview": item.get("overview"),
            "release_date": item.get("release_date") or item.get("first_air_date"),
            "poster_url": self._image_url(item.get("poster_path")),
            "vote_average": item.get("vote_average"),
            "genre_ids": item.get("genre_ids", []),
        }

    def _normalize_detail(self, item: dict[str, Any]) -> dict[str, Any]:
        credits = item.get("credits", {})
        cast = credits.get("cast", [])[:10]
        return {
            "id": item["id"],
            "title": item.get("title") or item.get("name") or "Sem título",
            "overview": item.get("overview"),
            "release_date": item.get("release_date") or item.get("first_air_date"),
            "poster_url": self._image_url(item.get("poster_path")),
            "vote_average": item.get("vote_average"),
            "cast": [
                {
                    "name": member.get("name", "Desconhecido"),
                    "character": member.get("character"),
                    "profile_url": self._image_url(member.get("profile_path")),
                }
                for member in cast
            ],
        }

    def _fixture_summary(self, movie) -> dict[str, Any]:
        return {
            "id": movie.id,
            "title": movie.title,
            "overview": movie.overview,
            "release_date": movie.release_date,
            "poster_url": None,
            "vote_average": None,
            "genre_ids": list(movie.genre_ids),
        }

    def _fixture_detail(self, movie) -> dict[str, Any]:
        return {
            "id": movie.id,
            "title": movie.title,
            "overview": movie.overview,
            "release_date": movie.release_date,
            "poster_url": None,
            "vote_average": None,
            "cast": [asdict(member) for member in movie.cast],
        }


tmdb_client = TmdbClient()
