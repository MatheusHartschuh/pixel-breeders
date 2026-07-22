from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db import Base, engine
from app.models import Rating, User, ratings_user_updated_at_index  # noqa: F401 - ensure model registration
from app.routers import movies, ratings, search
from app.routers.auth import router as auth_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ratings_user_updated_at_index.create(bind=engine, checkfirst=True)
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(search.router, prefix=settings.api_prefix)
app.include_router(movies.router, prefix=settings.api_prefix)
app.include_router(ratings.router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
