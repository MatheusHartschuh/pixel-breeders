import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import type { MovieSummary } from "../../types";
import { formatReleaseDate } from "../../lib/format";
import { MoviePoster } from "../MoviePoster";
import { RatingStars } from "../RatingStars";
import { MOVIE_CARD_CLASSNAMES, MOVIE_CARD_COPY } from "./style";

interface MovieCardProps {
  movie: MovieSummary;
  actions?: ReactNode;
}

export function MovieCard({ movie, actions }: MovieCardProps) {
  // Destaca quando o filme já recebeu uma nota do usuário.
  const ratingBadge = typeof movie.user_rating === "number" ? (
    <span className="badge badge--soft">
      {MOVIE_CARD_COPY.userRatingPrefix} {movie.user_rating}/5
    </span>
  ) : null;

  // Exibe a sinopse somente quando houver texto disponível.
  const overview = movie.overview ? <p className={MOVIE_CARD_CLASSNAMES.overview}>{movie.overview}</p> : null;

  // Mostra as estrelas preenchidas para a avaliação já salva.
  const ratingStars = typeof movie.user_rating === "number" ? (
    <div className={MOVIE_CARD_CLASSNAMES.rating}>
      <RatingStars value={movie.user_rating} size="sm" />
    </div>
  ) : null;

  // Agrupa as ações opcionais recebidas pelo card.
  const cardActions = actions ? <div className={MOVIE_CARD_CLASSNAMES.actions}>{actions}</div> : null;

  // Monta o conteúdo principal do card com link para a página do filme.
  const movieCardContent = (
    <Link to={`/movie/${movie.id}`} className={MOVIE_CARD_CLASSNAMES.link}>
      <div className={MOVIE_CARD_CLASSNAMES.media}>
        <MoviePoster title={movie.title} posterUrl={movie.poster_url} />
      </div>

      <div className={MOVIE_CARD_CLASSNAMES.body}>
        <div className={MOVIE_CARD_CLASSNAMES.heading}>
          <h3 className={MOVIE_CARD_CLASSNAMES.title}>{movie.title}</h3>

          {ratingBadge}
        </div>

        <p className={MOVIE_CARD_CLASSNAMES.meta}>{formatReleaseDate(movie.release_date)}</p>

        {overview}

        {ratingStars}
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
