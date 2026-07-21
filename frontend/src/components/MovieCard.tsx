import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import type { MovieSummary } from "../types";
import { formatReleaseDate } from "../lib/format";
import { MoviePoster } from "./MoviePoster";
import { RatingStars } from "./RatingStars";

interface MovieCardProps {
  movie: MovieSummary;
  actions?: ReactNode;
}

export function MovieCard({ movie, actions }: MovieCardProps) {
  return (
    <article className="movie-card">
      <Link to={`/movie/${movie.id}`} className="movie-card__link">
        <div className="movie-card__media">
          <MoviePoster title={movie.title} posterUrl={movie.poster_url} />
        </div>

        <div className="movie-card__body">
          <div className="movie-card__heading">
            <h3 className="movie-card__title">{movie.title}</h3>

            {typeof movie.user_rating === "number" ? (
              <span className="badge badge--soft">Sua nota {movie.user_rating}/5</span>
            ) : null}
          </div>

          <p className="movie-card__meta">{formatReleaseDate(movie.release_date)}</p>

          {movie.overview ? <p className="movie-card__overview">{movie.overview}</p> : null}

          {typeof movie.user_rating === "number" ? (
            <div className="movie-card__rating">
              <RatingStars value={movie.user_rating} size="sm" />
            </div>
          ) : null}
        </div>
      </Link>

      {actions ? <div className="movie-card__actions">{actions}</div> : null}
    </article>
  );
}
