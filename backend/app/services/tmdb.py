from __future__ import annotations

from dataclasses import asdict
from typing import Any

import httpx

from app.core.config import settings
from app.fixtures import get_movie as get_fixture_movie
from app.fixtures import paginate_movies as paginate_fixture_movies


class MovieNotFoundError(Exception):
    pass


class TmdbClient:
    def __init__(self) -> None:
        self.api_key = settings.tmdb_api_key
        self.base_url = settings.tmdb_base_url.rstrip("/")
        self.image_base_url = settings.tmdb_image_base_url.rstrip("/")
        self.language = settings.tmdb_language
        self.timeout = settings.tmdb_timeout

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
        if not self.use_live_api:
            payload = paginate_fixture_movies(query, page, year=year, genre_id=genre_id)
            return {
                "items": [self._fixture_summary(movie) for movie in payload["items"]],
                "page": payload["page"],
                "total_pages": payload["total_pages"],
                "total_results": payload["total_results"],
            }

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
            return {
                "items": [self._fixture_summary(movie) for movie in payload["items"]],
                "page": payload["page"],
                "total_pages": payload["total_pages"],
                "total_results": payload["total_results"],
            }

        items = [self._normalize_movie(item) for item in data.get("results", [])]
        if genre_id is not None and query:
            items = [item for item in items if genre_id in item.get("genre_ids", [])]
        if year is not None and query:
            items = [
                item
                for item in items
                if (item.get("release_date") or item.get("first_air_date") or "").startswith(str(year))
            ]
        return {
            "items": items,
            "page": data.get("page", page),
            "total_pages": data.get("total_pages", 1),
            "total_results": data.get("total_results", len(items)),
        }

    def get_movie_details(self, movie_id: int) -> dict[str, Any]:
        if not self.use_live_api:
            movie = get_fixture_movie(movie_id)
            if movie is None:
                raise MovieNotFoundError(f"Movie {movie_id} was not found in the local fixtures")
            return self._fixture_detail(movie)

        params = {
            "language": self.language,
            "append_to_response": "credits",
            "api_key": self.api_key,
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.get(f"{self.base_url}/movie/{movie_id}", params=params)
                if response.status_code == 404:
                    raise MovieNotFoundError(f"Movie {movie_id} not found")
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError:
            movie = get_fixture_movie(movie_id)
            if movie is None:
                raise MovieNotFoundError(f"Movie {movie_id} was not found in the local fixtures")
            return self._fixture_detail(movie)

        return self._normalize_detail(data)

    def _image_url(self, poster_path: str | None) -> str | None:
        if not poster_path:
            return None
        if poster_path.startswith("http"):
            return poster_path
        return f"{self.image_base_url}{poster_path}"

    def _normalize_movie(self, item: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": item["id"],
            "title": item.get("title") or item.get("name") or "Untitled",
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
            "title": item.get("title") or item.get("name") or "Untitled",
            "overview": item.get("overview"),
            "release_date": item.get("release_date") or item.get("first_air_date"),
            "poster_url": self._image_url(item.get("poster_path")),
            "vote_average": item.get("vote_average"),
            "cast": [
                {
                    "name": member.get("name", "Unknown"),
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
