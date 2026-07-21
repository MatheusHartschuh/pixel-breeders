from __future__ import annotations

import logging
import unicodedata
from copy import deepcopy
from dataclasses import asdict
from dataclasses import dataclass
from datetime import date
from math import ceil
from threading import RLock
from time import monotonic
from typing import Any, Literal

import httpx

from app.core.config import settings
from app.fixtures import get_movie as get_fixture_movie
from app.fixtures import paginate_movies as paginate_fixture_movies

logger = logging.getLogger(__name__)

TMDB_SOURCE: Literal["tmdb"] = "tmdb"
FIXTURE_SOURCE: Literal["fixture"] = "fixture"
SearchSortMode = Literal["relevance", "recent", "rating", "title"]
PAGE_SIZE = 20
DISCOVER_SORT_BY: dict[SearchSortMode, str] = {
    "recent": "primary_release_date.desc",
    "rating": "vote_average.desc",
    "title": "title.asc",
}


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
        sort: SearchSortMode = "relevance",
    ) -> dict[str, Any]:
        query = query.strip()
        cache_key = ("search", query, page, year, genre_id, sort, self.use_live_api)
        cached = self.search_cache.get(cache_key)
        if cached is not None:
            return cached

        if not self.use_live_api:
            result = self._fixture_search_result(
                query=query,
                page=page,
                year=year,
                genre_id=genre_id,
                sort=sort,
                reason="TMDB_API_KEY ausente",
            )
            self.search_cache.set(cache_key, result)
            return deepcopy(result)

        if not query:
            result = self._live_discover_result(page=page, year=year, genre_id=genre_id, sort=sort)
            self.search_cache.set(cache_key, result)
            return deepcopy(result)

        if sort == "relevance" and genre_id is None:
            result = self._live_search_page(query=query, page=page, year=year)
            self.search_cache.set(cache_key, result)
            return deepcopy(result)

        full_cache_key = ("search-all", query, year, genre_id, sort, self.use_live_api)
        full_cached = self.search_cache.get(full_cache_key)
        if full_cached is None:
            try:
                full_cached = self._live_search_all(query=query, year=year, genre_id=genre_id, sort=sort)
            except httpx.HTTPError as exc:
                result = self._fixture_search_result(
                    query=query,
                    page=page,
                    year=year,
                    genre_id=genre_id,
                    sort=sort,
                    reason=f"falha na chamada ao TMDB ({exc.__class__.__name__}: {exc})",
                )
                self.search_cache.set(cache_key, result)
                return deepcopy(result)
            self.search_cache.set(full_cache_key, full_cached)

        result = self._page_from_full_result(full_cached, page)
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
            result = self._fixture_detail(movie, reason="TMDB_API_KEY ausente")
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
        except httpx.HTTPError as exc:
            movie = get_fixture_movie(movie_id)
            if movie is None:
                raise MovieNotFoundError(f"Filme {movie_id} não encontrado nos dados locais.")
            result = self._fixture_detail(
                movie,
                reason=f"falha na chamada ao TMDB ({exc.__class__.__name__}: {exc})",
            )
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

    def _normalize_sort_text(self, value: str | None) -> str:
        if not value:
            return ""

        normalized = unicodedata.normalize("NFD", value)
        return "".join(char for char in normalized if unicodedata.category(char) != "Mn").casefold()

    def _release_sort_value(self, item: dict[str, Any]) -> int:
        value = item.get("release_date") or item.get("first_air_date")
        if not value:
            return 0

        try:
            return date.fromisoformat(value).toordinal()
        except ValueError:
            return 0

    def _release_year_value(self, item: dict[str, Any]) -> int | None:
        value = item.get("release_date") or item.get("first_air_date")
        if not value:
            return None

        try:
            return date.fromisoformat(value).year
        except ValueError:
            return None

    def _rating_sort_value(self, item: dict[str, Any]) -> float:
        value = item.get("vote_average")
        if isinstance(value, (int, float)):
            return float(value)
        return -1.0

    def _sort_items(self, items: list[dict[str, Any]], sort: SearchSortMode) -> list[dict[str, Any]]:
        if sort == "relevance":
            return items

        if sort == "recent":
            return sorted(
                items,
                key=lambda item: (-self._release_sort_value(item), self._normalize_sort_text(item.get("title") or item.get("name"))),
            )

        if sort == "rating":
            return sorted(
                items,
                key=lambda item: (-self._rating_sort_value(item), self._normalize_sort_text(item.get("title") or item.get("name"))),
            )

        return sorted(
            items,
            key=lambda item: (
                self._normalize_sort_text(item.get("title") or item.get("name")),
                -self._release_sort_value(item),
            ),
        )

    def _discover_params(self, page: int, year: int | None, genre_id: int | None, sort: SearchSortMode) -> dict[str, Any]:
        params: dict[str, Any] = {
            "language": self.language,
            "page": page,
            "include_adult": "false",
            "api_key": self.api_key,
        }
        if year is not None:
            params["primary_release_year"] = year
        if genre_id is not None:
            params["with_genres"] = genre_id
        if sort != "relevance":
            params["sort_by"] = DISCOVER_SORT_BY[sort]
        return params

    def _search_params(self, query: str, page: int, year: int | None) -> dict[str, Any]:
        params: dict[str, Any] = {
            "language": self.language,
            "page": page,
            "include_adult": "false",
            "api_key": self.api_key,
            "query": query,
        }
        if year is not None:
            params["primary_release_year"] = year
        return params

    def _request_json(self, endpoint: str, params: dict[str, Any]) -> dict[str, Any]:
        with httpx.Client(timeout=self.timeout) as client:
            response = client.get(f"{self.base_url}{endpoint}", params=params)
            response.raise_for_status()
            return response.json()

    def _normalize_items(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [self._normalize_movie(item) for item in items]

    def _page_from_items(self, items: list[dict[str, Any]], page: int, source: Literal["tmdb", "fixture"]) -> dict[str, Any]:
        total_results = len(items)
        total_pages = max(1, ceil(total_results / PAGE_SIZE))
        current_page = min(max(page, 1), total_pages)
        start = (current_page - 1) * PAGE_SIZE
        end = start + PAGE_SIZE
        return {
            "items": items[start:end],
            "page": current_page,
            "total_pages": total_pages,
            "total_results": total_results,
            "source": source,
        }

    def _page_from_full_result(self, result: dict[str, Any], page: int) -> dict[str, Any]:
        return self._page_from_items(result["items"], page, result["source"])

    def _live_search_page(self, query: str, page: int, year: int | None) -> dict[str, Any]:
        data = self._request_json("/search/movie", self._search_params(query, page, year))
        items = self._normalize_items(data.get("results", []))
        result = {
            "items": items,
            "page": data.get("page", page),
            "total_pages": data.get("total_pages", 1),
            "total_results": data.get("total_results", len(items)),
            "source": TMDB_SOURCE,
        }
        return result

    def _live_search_all(
        self,
        query: str,
        year: int | None,
        genre_id: int | None,
        sort: SearchSortMode,
    ) -> dict[str, Any]:
        first_page = self._request_json("/search/movie", self._search_params(query, 1, year))
        total_pages = int(first_page.get("total_pages", 1) or 1)
        items = self._normalize_items(first_page.get("results", []))

        for next_page in range(2, total_pages + 1):
            next_data = self._request_json("/search/movie", self._search_params(query, next_page, year))
            items.extend(self._normalize_items(next_data.get("results", [])))

        if year is not None:
            items = [
                item
                for item in items
                if (item.get("release_date") or item.get("first_air_date") or "").startswith(str(year))
            ]

        if genre_id is not None:
            items = [item for item in items if genre_id in item.get("genre_ids", [])]

        items = self._sort_items(items, sort)
        return {
            "items": items,
            "page": 1,
            "total_pages": max(1, ceil(len(items) / PAGE_SIZE)),
            "total_results": len(items),
            "source": TMDB_SOURCE,
        }

    def _live_discover_result(
        self,
        page: int,
        year: int | None,
        genre_id: int | None,
        sort: SearchSortMode,
    ) -> dict[str, Any]:
        data = self._request_json("/discover/movie", self._discover_params(page, year, genre_id, sort))
        items = self._normalize_items(data.get("results", []))
        return {
            "items": items,
            "page": data.get("page", page),
            "total_pages": data.get("total_pages", 1),
            "total_results": data.get("total_results", len(items)),
            "source": TMDB_SOURCE,
        }

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
            "source": TMDB_SOURCE,
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

    def _fixture_search_result(
        self,
        query: str,
        page: int,
        year: int | None,
        genre_id: int | None,
        sort: SearchSortMode,
        reason: str,
    ) -> dict[str, Any]:
        logger.warning(
            "TMDB fallback para fixtures em search (motivo: %s). query=%r page=%s year=%s genre_id=%s sort=%s",
            reason,
            query,
            page,
            year,
            genre_id,
            sort,
        )
        payload = paginate_fixture_movies(
            query,
            page,
            year=year,
            genre_id=genre_id,
            sort=sort,
        )
        return {
            "items": [self._fixture_summary(movie) for movie in payload["items"]],
            "page": payload["page"],
            "total_pages": payload["total_pages"],
            "total_results": payload["total_results"],
            "source": FIXTURE_SOURCE,
        }

    def _fixture_detail(self, movie, reason: str) -> dict[str, Any]:
        logger.warning("TMDB fallback para fixtures em movie detail (motivo: %s). movie_id=%s", reason, movie.id)
        return {
            "id": movie.id,
            "title": movie.title,
            "overview": movie.overview,
            "release_date": movie.release_date,
            "poster_url": None,
            "vote_average": None,
            "cast": [asdict(member) for member in movie.cast],
            "source": FIXTURE_SOURCE,
        }


tmdb_client = TmdbClient()
