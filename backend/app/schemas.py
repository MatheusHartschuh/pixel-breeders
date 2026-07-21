from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic_core import PydanticCustomError


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
    source: Literal["tmdb", "fixture"] = "tmdb"


class SearchResponse(BaseModel):
    items: list[MovieSummary]
    page: int
    total_pages: int
    total_results: int
    source: Literal["tmdb", "fixture"] = "tmdb"


class AuthCredentials(BaseModel):
    username: str = Field()
    password: str = Field()

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        normalized = value.strip().casefold()
        if len(normalized) < 3:
            raise PydanticCustomError("username_too_short", "O nome de usuário deve ter pelo menos 3 caracteres")
        if len(normalized) > 50:
            raise PydanticCustomError("username_too_long", "O nome de usuário deve ter no máximo 50 caracteres")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 6:
            raise PydanticCustomError("password_too_short", "A senha deve ter pelo menos 6 caracteres.")
        if len(value) > 128:
            raise PydanticCustomError("password_too_long", "A senha deve ter no máximo 128 caracteres.")
        return value


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


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
