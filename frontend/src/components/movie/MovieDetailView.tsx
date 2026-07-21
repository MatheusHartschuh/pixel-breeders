import { Link } from "react-router-dom";

import { formatReleaseDate } from "../../lib/format";
import type { AuthUser, CastMember, MovieDetail } from "../../types";
import { MoviePoster } from "../MoviePoster";
import { RatingStars } from "../RatingStars";
import { Page } from "../layout/Page";
import { Panel } from "../layout/Panel";
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

  return (
    <Page>
      <section className="detail-layout">
        <div className="detail-layout__media">
          <MoviePoster title={movie.title} posterUrl={movie.poster_url} className="movie-poster--detail" />
        </div>

        <div className="detail-layout__content">
          <Breadcrumb />
          <MovieHeader movie={movie} hasRating={hasRating} />
          <Panel title="Sinopse">
            <p>{movie.overview || "Sinopse indisponível."}</p>
          </Panel>
          <Panel title="Elenco">
            {movie.cast.length > 0 ? <CastList cast={movie.cast} /> : <p>Elenco indisponível.</p>}
          </Panel>
          <RatingPanel
            movie={movie}
            hasRating={hasRating}
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
        </div>
      </section>
    </Page>
  );
}

export function MovieDetailSkeleton() {
  return (
    <Page>
      <section className="detail-layout">
        <div className="movie-poster movie-poster--detail skeleton skeleton--poster" />
        <div className="detail-layout__content">
          <div className="skeleton skeleton--line skeleton--title" />
          <div className="skeleton skeleton--line skeleton--short" />
          <div className="panel">
            <div className="skeleton skeleton--line skeleton--section" />
            <div className="skeleton skeleton--paragraph" />
          </div>
          <div className="panel">
            <div className="skeleton skeleton--line skeleton--section" />
            <div className="skeleton skeleton--paragraph" />
          </div>
          <div className="panel">
            <div className="skeleton skeleton--line skeleton--section" />
            <div className="skeleton skeleton--rating" />
          </div>
        </div>
      </section>
    </Page>
  );
}

function Breadcrumb() {
  return (
    <div className="breadcrumb">
      <Link to="/">Busca</Link>
      <span> / </span>
      <Link to="/rated">Avaliados</Link>
    </div>
  );
}

function MovieHeader({ movie, hasRating }: { movie: MovieDetail; hasRating: boolean }) {
  return (
    <header className="detail-layout__header">
      <span className="eyebrow">Detalhes do filme</span>
      <h1>{movie.title}</h1>
      <p className="detail-layout__meta">
        <span>{formatReleaseDate(movie.release_date)}</span>
        {hasRating ? <span className="badge badge--accent">Já avaliado</span> : <span className="badge">Sem nota</span>}
      </p>
    </header>
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

function RatingPanel({
  movie,
  hasRating,
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
}: MovieDetailViewProps & { hasRating: boolean }) {
  const currentRating = movie.user_rating ?? 0;

  if (isCheckingSession) {
    return (
      <Panel className="panel--rating" title="Carregando sessão" description="Estamos verificando seu acesso para liberar a avaliação.">
        <div className="skeleton skeleton--line skeleton--section" />
        <div className="skeleton skeleton--rating" />
      </Panel>
    );
  }

  if (!user) {
    return (
      <Panel className="panel--rating" title="Entre para avaliar" description="O login libera as ações protegidas e salva sua nota no seu perfil.">
        <p className="auth-callout">Você pode navegar pelos detalhes sem login, mas precisa entrar para avaliar.</p>
        <div className="panel__actions">
          <Button variant="primary" to={`/login?next=${nextPath}`}>
            Entrar
          </Button>
          <Button variant="secondary" to={`/register?next=${nextPath}`}>
            Criar conta
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      className="panel--rating"
      title={hasRating ? "Editar avaliação" : "Avaliar filme"}
      description="Escolha uma nota de 1 a 5 e grave no banco."
      aside={hasRating ? <span className="badge badge--soft">Nota atual {currentRating}/5</span> : null}
    >
      <RatingStars value={selectedRating} onChange={onRatingChange} size="lg" />

      <div className="panel__actions">
        <Button variant="primary" type="button" disabled={saving || selectedRating < 1} onClick={onSave}>
          {saving ? "Salvando..." : hasRating ? "Atualizar avaliação" : "Salvar avaliação"}
        </Button>

        <Button variant="danger" type="button" disabled={saving || !hasRating} onClick={onDelete}>
          Remover avaliação
        </Button>
      </div>

      {statusMessage ? <p className="feedback feedback--success">{statusMessage}</p> : null}
      {error ? <p className="feedback feedback--error">{error}</p> : null}
    </Panel>
  );
}
