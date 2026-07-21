from sqlalchemy import select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.db import get_db
from app.models import Rating
from app.schemas import RatingCreate, RatingRead, RatingUpdate

router = APIRouter(tags=["ratings"])


def _get_rating_or_404(db: Session, tmdb_id: int) -> Rating:
    rating = db.scalar(select(Rating).where(Rating.tmdb_id == tmdb_id))
    if rating is None:
        raise HTTPException(status_code=404, detail="Rating not found")
    return rating


@router.get("/ratings", response_model=list[RatingRead])
def list_ratings(db: Session = Depends(get_db)) -> list[RatingRead]:
    ratings = db.scalars(select(Rating).order_by(Rating.updated_at.desc())).all()
    return list(ratings)


@router.post("/ratings", response_model=RatingRead, status_code=status.HTTP_201_CREATED)
def create_rating(payload: RatingCreate, db: Session = Depends(get_db)) -> RatingRead:
    rating = db.scalar(select(Rating).where(Rating.tmdb_id == payload.tmdb_id))
    if rating is None:
        rating = Rating(
            tmdb_id=payload.tmdb_id,
            title=payload.title,
            poster_url=payload.poster_url,
            overview=payload.overview,
            release_date=payload.release_date,
            rating=payload.rating,
        )
        db.add(rating)
    else:
        rating.title = payload.title
        rating.poster_url = payload.poster_url
        rating.overview = payload.overview
        rating.release_date = payload.release_date
        rating.rating = payload.rating

    db.commit()
    db.refresh(rating)
    return rating


@router.patch("/ratings/{tmdb_id}", response_model=RatingRead)
def update_rating(tmdb_id: int, payload: RatingUpdate, db: Session = Depends(get_db)) -> RatingRead:
    rating = _get_rating_or_404(db, tmdb_id)
    rating.rating = payload.rating
    db.commit()
    db.refresh(rating)
    return rating


@router.delete("/ratings/{tmdb_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rating(tmdb_id: int, db: Session = Depends(get_db)) -> Response:
    rating = _get_rating_or_404(db, tmdb_id)
    db.delete(rating)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
