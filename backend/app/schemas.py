from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class CastMember(BaseModel):
    name: str
    character: str | None = None
    profile_url: str | None = None


class MovieSummary(BaseModel):
    id: int
    title: str
    overview: str | None = None
    release_date: str | None = None
    poster_url: str | None = None
    user_rating: int | None = None
    vote_average: float | None = None
    genre_ids: list[int] = Field(default_factory=list)


class MovieDetail(MovieSummary):
    cast: list[CastMember] = Field(default_factory=list)


class SearchResponse(BaseModel):
    items: list[MovieSummary]
    page: int
    total_pages: int
    total_results: int


class RatingBase(BaseModel):
    tmdb_id: int
    title: str
    poster_url: str | None = None
    overview: str | None = None
    release_date: str | None = None


class RatingCreate(RatingBase):
    rating: int = Field(ge=1, le=5)


class RatingUpdate(BaseModel):
    rating: int = Field(ge=1, le=5)


class RatingRead(RatingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rating: int
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    message: str
