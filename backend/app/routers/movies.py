from sqlalchemy import select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException

from app.db import get_db
from app.models import Rating
from app.schemas import CastMember, MovieDetail
from app.services.tmdb import MovieNotFoundError, tmdb_client

router = APIRouter(tags=["movies"])


@router.get("/movies/{movie_id}", response_model=MovieDetail)
def get_movie(movie_id: int, db: Session = Depends(get_db)) -> MovieDetail:
    try:
        movie = tmdb_client.get_movie_details(movie_id)
    except MovieNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    rating = db.scalar(select(Rating.rating).where(Rating.tmdb_id == movie_id))
    cast = movie.pop("cast", [])
    return MovieDetail(
        **movie,
        cast=[CastMember(**member) for member in cast],
        user_rating=rating,
    )
