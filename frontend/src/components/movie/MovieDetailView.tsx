import { Link } from "react-router-dom";

import { formatReleaseYear, formatRating, formatVoteAverage } from "../../lib/format";
import type { AuthUser, CastMember, MovieDetail } from "../../types";
import { DataSourceBanner } from "../layout/DataSourceBanner";
import { MoviePoster } from "../MoviePoster";
import { RatingStars } from "../RatingStars";
import { Page } from "../layout/Page";
import { Button } from "../ui/Button";
import { ptBR } from "../../i18n";

const MOVIE = ptBR.movie;

interface MovieDetailViewProps {
  movie: MovieDetail;
  selectedRating: number;
  onRatingChange: (value: number) => void;
  onSave: () => void;
  onDelete: () => void;
  onRequestLogin: () => void;
  saving: boolean;
  statusMessage: string;
  error: string;
  user: AuthUser | null;
  isCheckingSession: boolean;
}

export function MovieDetailView({
  movie,
  selectedRating,
  onRatingChange,
  onSave,
  onDelete,
  onRequestLogin,
  saving,
  statusMessage,
  error,
  user,
  isCheckingSession,
}: MovieDetailViewProps) {
  const hasRating = typeof movie.user_rating === "number";
  const currentRating = movie.user_rating ?? 0;
  const year = formatReleaseYear(movie.release_date);
  const tmdbRating = formatVoteAverage(movie.vote_average);

  // Meta curta exibida ao lado do pôster.
  const posterMeta = (
    <>
      <span>{year}</span>
      <span>
        {MOVIE.labels.tmdb} {tmdbRating}
      </span>
    </>
  );

  // Meta compacta exibida no cabeçalho principal do filme.
  const movieMeta = (
    <>
      <span>{year}</span>
      <span>
        {MOVIE.labels.tmdb} {tmdbRating}
      </span>
      <span>{hasRating ? MOVIE.labels.alreadyRated : MOVIE.labels.notYetRated}</span>
    </>
  );

  // Cabeçalho principal com o título do filme, seus metadados e o resumo da nota.
  const movieHeader = (
    <header className="movie-page__header">
      <span className="eyebrow">{MOVIE.labels.detailTitle}</span>
      <h1>{movie.title}</h1>
      <p className="movie-page__meta">{movieMeta}</p>

      <div className="movie-page__rating-summary" aria-label={MOVIE.accessibility.ratingSummary}>
        <span className="movie-page__rating-label">{MOVIE.labels.myRating}</span>
        <strong>{hasRating ? formatRating(movie.user_rating) : MOVIE.labels.noRating}</strong>
        <p>{hasRating ? MOVIE.copies.ratedAlready : MOVIE.copies.ratedAfterSave}</p>
      </div>
    </header>
  );

  // Sinopse com título escondido para manter a semântica sem poluir a tela.
  const synopsisSection = (
    <section className="movie-section movie-section--synopsis" aria-labelledby="sinopse-title">
      <div className="movie-section__header">
        <span className="section-heading__eyebrow">{MOVIE.labels.synopsisEyebrow}</span>
        <h2 id="sinopse-title" className="sr-only">
          {MOVIE.labels.synopsisTitle}
        </h2>
      </div>
      <p>{movie.overview || MOVIE.copies.synopsisUnavailable}</p>
    </section>
  );

  // Elenco com título escondido para preservar a estrutura sem a frase visível.
  const castSection = (
    <section className="movie-section movie-section--cast" aria-labelledby="elenco-title">
      <div className="movie-section__header">
        <span className="section-heading__eyebrow">{MOVIE.labels.castEyebrow}</span>
        <h2 id="elenco-title" className="sr-only">
          {MOVIE.labels.castTitle}
        </h2>
      </div>
      {movie.cast.length > 0 ? <CastList cast={movie.cast} /> : <p className="movie-section__empty">{MOVIE.copies.castUnavailable}</p>}
    </section>
  );

  // Bloco de avaliação com a CTA de entrar preservada.
  const ratingModule = (
    <RatingModule
      movie={movie}
      hasRating={hasRating}
      currentRating={currentRating}
      selectedRating={selectedRating}
      onRatingChange={onRatingChange}
      onSave={onSave}
      onDelete={onDelete}
      onRequestLogin={onRequestLogin}
      saving={saving}
      statusMessage={statusMessage}
      error={error}
      user={user}
      isCheckingSession={isCheckingSession}
    />
  );

  return (
    <Page className="movie-page">
      <DataSourceBanner source={movie.source} className="movie-page__source-banner" />
      <div className="movie-page__crumbs" aria-label={MOVIE.accessibility.pathLabel}>
        <Link to="/">{MOVIE.crumbs.search}</Link>
        <span aria-hidden="true">/</span>
        <Link to="/rated">{MOVIE.crumbs.rated}</Link>
      </div>

      <section className="movie-page__layout">
        <aside className="movie-page__poster-column">
          <MoviePoster title={movie.title} posterUrl={movie.poster_url} className="movie-poster--detail" />

          <div className="movie-page__poster-meta" aria-label={MOVIE.accessibility.posterSummary}>
            {posterMeta}
          </div>
        </aside>

        <article className="movie-page__content">
          {movieHeader}
          {synopsisSection}
          {castSection}
          {ratingModule}
        </article>
      </section>
    </Page>
  );
}

export function MovieDetailSkeleton() {
  return (
    <Page className="movie-page">
      <div className="movie-page__crumbs">
        <div className="skeleton skeleton--crumb" />
      </div>

      <section className="movie-page__layout">
        <div className="movie-poster movie-poster--detail skeleton skeleton--poster" />

        <div className="movie-page__content">
          <div className="skeleton skeleton--line skeleton--title" />
          <div className="skeleton skeleton--line skeleton--short" />
          <div className="movie-section">
            <div className="skeleton skeleton--line skeleton--section" />
            <div className="skeleton skeleton--paragraph" />
          </div>
          <div className="movie-section">
            <div className="skeleton skeleton--line skeleton--section" />
            <div className="skeleton skeleton--paragraph" />
          </div>
          <div className="movie-page__rating-panel movie-page__rating-panel--loading">
            <div className="skeleton skeleton--line skeleton--section" />
            <div className="skeleton skeleton--rating" />
            <div className="skeleton skeleton--line skeleton--short" />
          </div>
        </div>
      </section>
    </Page>
  );
}

function CastList({ cast }: { cast: CastMember[] }) {
  return (
    <ul className="cast-list">
      {cast.map((member) => (
        <li key={`${member.name}-${member.character ?? "cast"}`} className="cast-list__item">
          <strong>{member.name}</strong>
          <span>{member.character || ptBR.common.labels.noCharacter}</span>
        </li>
      ))}
    </ul>
  );
}

function RatingModule({
  movie,
  hasRating,
  currentRating,
  selectedRating,
  onRatingChange,
  onSave,
  onDelete,
  onRequestLogin,
  saving,
  statusMessage,
  error,
  user,
  isCheckingSession,
}: MovieDetailViewProps & {
  hasRating: boolean;
  currentRating: number;
}) {
  if (isCheckingSession) {
    return (
      <section className="movie-page__rating-panel movie-page__rating-panel--loading" aria-labelledby="avaliacao-title">
        <div className="movie-section__header">
          <span className="section-heading__eyebrow">{MOVIE.labels.ratingEyebrow}</span>
          <h2 id="avaliacao-title">{MOVIE.labels.loadingRatingTitle}</h2>
        </div>
        <div className="skeleton skeleton--line skeleton--section" />
        <div className="skeleton skeleton--rating" />
      </section>
    );
  }

  if (!user) {
    return (
      <section className="movie-page__rating-panel movie-page__rating-panel--prompt" aria-labelledby="avaliacao-title">
        <div className="movie-section__header">
          <span className="section-heading__eyebrow">{MOVIE.labels.ratingEyebrow}</span>
          <h2 id="avaliacao-title" className="sr-only">
            {MOVIE.labels.enterToRateTitle}
          </h2>
        </div>
        <p className="movie-page__rating-copy">{MOVIE.copies.loginToRate}</p>
        <div className="movie-page__rating-preview" aria-hidden="true">
          <RatingStars value={0} size="lg" />
        </div>
        <div className="movie-page__actions">
          <Button variant="primary" type="button" onClick={onRequestLogin}>
            {MOVIE.buttons.signInToRate}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className={`movie-page__rating-panel ${hasRating ? "movie-page__rating-panel--rated" : ""}`} aria-labelledby="avaliacao-title">
      <div className="movie-page__rating-top">
        <div>
          <span className="section-heading__eyebrow">{MOVIE.labels.ratingEyebrow}</span>
          <h2 id="avaliacao-title">{hasRating ? MOVIE.labels.editRatingTitle : MOVIE.labels.saveRatingTitle}</h2>
          <p className="movie-page__rating-copy">{MOVIE.copies.rateInstruction}</p>
        </div>
        <span className="badge badge--accent">
          {hasRating ? `${MOVIE.labels.currentPrefix} ${currentRating}/5` : MOVIE.labels.unratedBadge}
        </span>
      </div>

      <RatingStars value={selectedRating} onChange={onRatingChange} size="lg" />

      <div className="movie-page__actions">
        <Button variant="primary" type="button" disabled={saving || selectedRating < 1} onClick={onSave}>
          {saving ? ptBR.common.labels.saving : hasRating ? MOVIE.buttons.update : MOVIE.buttons.save}
        </Button>

        <Button variant="ghost" type="button" disabled={saving || !hasRating} onClick={onDelete}>
          {MOVIE.buttons.remove}
        </Button>
      </div>

      {statusMessage ? <p className="feedback feedback--success">{statusMessage}</p> : null}
      {error ? <p className="feedback feedback--error">{error}</p> : null}
    </section>
  );
}
