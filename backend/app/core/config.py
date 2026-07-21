from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Pixel Breeders API"
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    database_url: str = "sqlite:///./pixel_breeders.db"
    tmdb_api_key: str | None = None
    tmdb_base_url: str = "https://api.themoviedb.org/3"
    tmdb_image_base_url: str = "https://image.tmdb.org/t/p/w500"
    tmdb_language: str = "pt-BR"
    tmdb_timeout: float = 10.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
