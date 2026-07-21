from sqlalchemy import select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, Query

from app.db import get_db
from app.models import Rating
from app.schemas import MovieSummary, SearchResponse
from app.services.tmdb import tmdb_client

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResponse)
def search_movies(
    query: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    db: Session = Depends(get_db),
) -> SearchResponse:
    response = tmdb_client.search_movies(query=query, page=page)
    ratings = {tmdb_id: rating for tmdb_id, rating in db.execute(select(Rating.tmdb_id, Rating.rating)).all()}

    items = [
        MovieSummary(**item, user_rating=ratings.get(item["id"]))
        for item in response["items"]
    ]
    return SearchResponse(
        items=items,
        page=response["page"],
        total_pages=response["total_pages"],
        total_results=response["total_results"],
    )
