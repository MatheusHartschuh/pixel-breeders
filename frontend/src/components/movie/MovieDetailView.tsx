import { Link } from "react-router-dom";

import { formatReleaseYear, formatRating, formatVoteAverage } from "../../lib/format";
import type { AuthUser, CastMember, MovieDetail } from "../../types";
import { MoviePoster } from "../MoviePoster";
import { RatingStars } from "../RatingStars";
import { Page } from "../layout/Page";
import { Button } from "../ui/Button";

interface MovieDetailViewProps {
  movie: MovieDetail;
  selectedRating: number;
  onRatingChange: (value: number) => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  statusMessage: string;
  error: string;
  user: AuthUser | null;
  isCheckingSession: boolean;
  nextPath: string;
}

export function MovieDetailView({
  movie,
  selectedRating,
  onRatingChange,
  onSave,
  onDelete,
  saving,
  statusMessage,
  error,
  user,
  isCheckingSession,
  nextPath,
}: MovieDetailViewProps) {
  const hasRating = typeof movie.user_rating === "number";
  const currentRating = movie.user_rating ?? 0;
  const year = formatReleaseYear(movie.release_date);
  const tmdbRating = formatVoteAverage(movie.vote_average);

  return (
    <Page className="movie-page">
      <div className="movie-page__crumbs" aria-label="Caminho da pagina">
        <Link to="/">Busca</Link>
        <span aria-hidden="true">/</span>
        <Link to="/rated">Avaliados</Link>
      </div>

      <section className="movie-page__layout">
        <aside className="movie-page__poster-column">
          <MoviePoster title={movie.title} posterUrl={movie.poster_url} className="movie-poster--detail" />

          <div className="movie-page__poster-meta" aria-label="Resumo rapido">
            <span>{year}</span>
            <span>TMDB {tmdbRating}</span>
          </div>
        </aside>

        <article className="movie-page__content">
          <header className="movie-page__header">
            <span className="eyebrow">Detalhe do filme</span>
            <h1>{movie.title}</h1>
            <p className="movie-page__meta">
              <span>{year}</span>
              <span>TMDB {tmdbRating}</span>
              <span>{hasRating ? "Já avaliado" : "Ainda sem avaliação"}</span>
            </p>

            <div className="movie-page__rating-summary" aria-label="Sua avaliacao">
              <span className="movie-page__rating-label">Minha nota</span>
              <strong>{hasRating ? formatRating(movie.user_rating) : "Sem nota"}</strong>
              <p>{hasRating ? "A avaliação ja faz parte da sua colecao." : "A sua nota aparece aqui depois do salvamento."}</p>
            </div>
          </header>

          <section className="movie-section movie-section--synopsis" aria-labelledby="sinopse-title">
            <div className="movie-section__header">
              <span className="section-heading__eyebrow">Sinopse</span>
              <h2 id="sinopse-title">O que o filme conta</h2>
            </div>
            <p>{movie.overview || "Sinopse indisponivel."}</p>
          </section>

          <section className="movie-section movie-section--cast" aria-labelledby="elenco-title">
            <div className="movie-section__header">
              <span className="section-heading__eyebrow">Elenco</span>
              <h2 id="elenco-title">Quem da vida ao filme</h2>
            </div>
            {movie.cast.length > 0 ? <CastList cast={movie.cast} /> : <p className="movie-section__empty">Elenco indisponivel.</p>}
          </section>

          <RatingModule
            movie={movie}
            hasRating={hasRating}
            currentRating={currentRating}
            selectedRating={selectedRating}
            onRatingChange={onRatingChange}
            onSave={onSave}
            onDelete={onDelete}
            saving={saving}
            statusMessage={statusMessage}
            error={error}
            user={user}
            isCheckingSession={isCheckingSession}
            nextPath={nextPath}
          />
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
          <span>{member.character || "Sem personagem informado"}</span>
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
  saving,
  statusMessage,
  error,
  user,
  isCheckingSession,
  nextPath,
}: MovieDetailViewProps & {
  hasRating: boolean;
  currentRating: number;
}) {
  if (isCheckingSession) {
    return (
      <section className="movie-page__rating-panel movie-page__rating-panel--loading" aria-labelledby="avaliacao-title">
        <div className="movie-section__header">
          <span className="section-heading__eyebrow">Avaliação</span>
          <h2 id="avaliacao-title">Carregando sessao</h2>
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
          <span className="section-heading__eyebrow">Avaliação</span>
          <h2 id="avaliacao-title">Entre para avaliar</h2>
        </div>
        <p className="movie-page__rating-copy">O login libera a nota pessoal e salva tudo na sua colecao.</p>
        <div className="movie-page__actions">
          <Button variant="primary" to={`/login?next=${nextPath}`}>
            Entrar
          </Button>
          <Button variant="secondary" to={`/register?next=${nextPath}`}>
            Criar conta
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className={`movie-page__rating-panel ${hasRating ? "movie-page__rating-panel--rated" : ""}`} aria-labelledby="avaliacao-title">
      <div className="movie-page__rating-top">
        <div>
          <span className="section-heading__eyebrow">Avaliação</span>
          <h2 id="avaliacao-title">{hasRating ? "Editar sua nota" : "Salvar sua nota"}</h2>
          <p className="movie-page__rating-copy">Escolha uma nota de 1 a 5 e mantenha o filme na sua estante pessoal.</p>
        </div>
        <span className="badge badge--accent">{hasRating ? `Atual ${currentRating}/5` : "Sem nota salva"}</span>
      </div>

      <RatingStars value={selectedRating} onChange={onRatingChange} size="lg" />

      <div className="movie-page__actions">
        <Button variant="primary" type="button" disabled={saving || selectedRating < 1} onClick={onSave}>
          {saving ? "Salvando..." : hasRating ? "Atualizar avaliação" : "Salvar avaliação"}
        </Button>

        <Button variant="ghost" type="button" disabled={saving || !hasRating} onClick={onDelete}>
          Remover avaliação
        </Button>
      </div>

      {statusMessage ? <p className="feedback feedback--success">{statusMessage}</p> : null}
      {error ? <p className="feedback feedback--error">{error}</p> : null}
    </section>
  );
}
