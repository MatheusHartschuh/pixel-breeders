import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import type { MovieSummary } from "../../types";
import { formatReleaseYear, formatRating, formatVoteAverage } from "../../lib/format";
import { MoviePoster } from "../MoviePoster";
import { MOVIE_CARD_CLASSNAMES, MOVIE_CARD_COPY } from "./style";
import { ptBR } from "../../i18n";

interface MovieCardProps {
  movie: MovieSummary;
  actions?: ReactNode;
  ratingDate?: string;
  showTmdbScore?: boolean;
}

export function MovieCard({ movie, actions, ratingDate, showTmdbScore = true }: MovieCardProps) {
  const tmdbRating = formatVoteAverage(movie.vote_average);
  const userRating = typeof movie.user_rating === "number" ? formatRating(movie.user_rating) : null;
  const cardActions = actions ? <div className={MOVIE_CARD_CLASSNAMES.actions}>{actions}</div> : null;

  const movieCardContent = (
    <Link to={`/movie/${movie.id}`} className={MOVIE_CARD_CLASSNAMES.link} aria-label={ptBR.cards.openMovieAria(movie.title)}>
      <div className={MOVIE_CARD_CLASSNAMES.poster}>
        <MoviePoster title={movie.title} posterUrl={movie.poster_url} />
      </div>

      <div className={MOVIE_CARD_CLASSNAMES.body}>
        <div className={MOVIE_CARD_CLASSNAMES.titleRow}>
          <h3 className={MOVIE_CARD_CLASSNAMES.title}>{movie.title}</h3>
          <span className={MOVIE_CARD_CLASSNAMES.year}>{formatReleaseYear(movie.release_date)}</span>
        </div>
      </div>
    </Link>
  );

  return (
    <article className="movie-card">
      {movieCardContent}
      <div className={MOVIE_CARD_CLASSNAMES.details}>
        <div className={MOVIE_CARD_CLASSNAMES.metaRow}>
          <div className={MOVIE_CARD_CLASSNAMES.scores}>
            {showTmdbScore ? (
              <span className={`${MOVIE_CARD_CLASSNAMES.score} movie-card__score--tmdb`}>TMDB {tmdbRating}</span>
            ) : null}
            {userRating ? (
              <span className={`${MOVIE_CARD_CLASSNAMES.score} movie-card__score--user`}>
                {MOVIE_CARD_COPY.userRatingPrefix} {userRating}
              </span>
            ) : null}
          </div>

          {cardActions}
        </div>

        {ratingDate ? <p className={MOVIE_CARD_CLASSNAMES.ratingDate}>{ptBR.cards.ratedAtPrefix} {ratingDate}</p> : null}
      </div>
    </article>
  );
}
