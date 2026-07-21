import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import type { MovieSummary } from "../../types";
import { formatReleaseYear, formatRating, formatVoteAverage } from "../../lib/format";
import { MoviePoster } from "../MoviePoster";
import { MOVIE_CARD_CLASSNAMES, MOVIE_CARD_COPY } from "./style";

interface MovieCardProps {
  movie: MovieSummary;
  actions?: ReactNode;
  ratingDate?: string;
}

export function MovieCard({ movie, actions, ratingDate }: MovieCardProps) {
  const tmdbRating = formatVoteAverage(movie.vote_average);
  const userRating = typeof movie.user_rating === "number" ? formatRating(movie.user_rating) : null;
  const cardActions = actions ? <div className={MOVIE_CARD_CLASSNAMES.actions}>{actions}</div> : null;

  const movieCardContent = (
    <Link to={`/movie/${movie.id}`} className={MOVIE_CARD_CLASSNAMES.link} aria-label={`Abrir ${movie.title}`}>
      <div className={MOVIE_CARD_CLASSNAMES.poster}>
        <MoviePoster title={movie.title} posterUrl={movie.poster_url} />
      </div>

      <div className={MOVIE_CARD_CLASSNAMES.body}>
        <div className={MOVIE_CARD_CLASSNAMES.titleRow}>
          <h3 className={MOVIE_CARD_CLASSNAMES.title}>{movie.title}</h3>
          <span className={MOVIE_CARD_CLASSNAMES.year}>{formatReleaseYear(movie.release_date)}</span>
        </div>

        <div className={MOVIE_CARD_CLASSNAMES.scores}>
          <span className={`${MOVIE_CARD_CLASSNAMES.score} movie-card__score--tmdb`}>TMDB {tmdbRating}</span>
          {userRating ? (
            <span className={`${MOVIE_CARD_CLASSNAMES.score} movie-card__score--user`}>
              {MOVIE_CARD_COPY.userRatingPrefix} {userRating}
            </span>
          ) : null}
        </div>

        {ratingDate ? <p className={MOVIE_CARD_CLASSNAMES.ratingDate}>Avaliada em {ratingDate}</p> : null}
      </div>
    </Link>
  );

  return (
    <article className="movie-card">
      {movieCardContent}
      {cardActions}
    </article>
  );
}
