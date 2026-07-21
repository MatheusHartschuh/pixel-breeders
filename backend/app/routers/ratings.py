from sqlalchemy import select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.security import get_current_user
from app.db import get_db
from app.models import Rating, User
from app.schemas import RatingCreate, RatingRead, RatingUpdate

router = APIRouter(tags=["ratings"])


def _get_rating_or_404(db: Session, user_id: int, tmdb_id: int) -> Rating:
    rating = db.scalar(select(Rating).where(Rating.user_id == user_id, Rating.tmdb_id == tmdb_id))
    if rating is None:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")
    return rating


@router.get("/ratings", response_model=list[RatingRead])
def list_ratings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[RatingRead]:
    ratings = db.scalars(
        select(Rating).where(Rating.user_id == current_user.id).order_by(Rating.updated_at.desc())
    ).all()
    return list(ratings)


@router.post("/ratings", response_model=RatingRead, status_code=status.HTTP_201_CREATED)
def create_rating(
    payload: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RatingRead:
    rating = db.scalar(
        select(Rating).where(Rating.user_id == current_user.id, Rating.tmdb_id == payload.tmdb_id)
    )
    if rating is None:
        rating = Rating(
            user_id=current_user.id,
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
def update_rating(
    tmdb_id: int,
    payload: RatingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RatingRead:
    rating = _get_rating_or_404(db, current_user.id, tmdb_id)
    rating.rating = payload.rating
    db.commit()
    db.refresh(rating)
    return rating


@router.delete("/ratings/{tmdb_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rating(tmdb_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Response:
    rating = _get_rating_or_404(db, current_user.id, tmdb_id)
    db.delete(rating)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
