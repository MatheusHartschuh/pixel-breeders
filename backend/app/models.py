from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Rating(Base):
    __tablename__ = "ratings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tmdb_id: Mapped[int] = mapped_column(Integer, unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    poster_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    overview: Mapped[str | None] = mapped_column(Text, nullable=True)
    release_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
