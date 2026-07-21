import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { createRating, deleteRating, getMovie, updateRating } from "../api";
import { MoviePoster } from "../components/MoviePoster";
import { RatingStars } from "../components/RatingStars";
import { formatReleaseDate } from "../lib/format";
import type { MovieDetail } from "../types";

export function MoviePage() {
  const params = useParams();
  const movieId = Number(params.movieId);

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = movie ? `${movie.title} | Pixel Breeders` : "Pixel Breeders | Filme";
  }, [movie]);

  useEffect(() => {
    if (Number.isNaN(movieId)) {
      setError("ID do filme inválido.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    setStatusMessage("");

    getMovie(movieId)
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setMovie(response);
        setSelectedRating(response.user_rating ?? 0);
        setLoading(false);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : "Falha ao carregar o filme");
        setLoading(false);
      });

    return () => controller.abort();
  }, [movieId]);

  async function handleSave() {
    if (!movie || selectedRating < 1) {
      return;
    }

    setSaving(true);
    setError("");
    setStatusMessage("");

    try {
      const payload = {
        tmdb_id: movie.id,
        title: movie.title,
        poster_url: movie.poster_url,
        overview: movie.overview,
        release_date: movie.release_date,
        rating: selectedRating,
      };

      const savedRating = movie.user_rating
        ? await updateRating(movie.id, selectedRating)
        : await createRating(payload);

      setMovie((current) => (current ? { ...current, user_rating: savedRating.rating } : current));
      setStatusMessage("Avaliação salva com sucesso.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível salvar a avaliação");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!movie?.user_rating) {
      return;
    }

    setSaving(true);
    setError("");
    setStatusMessage("");

    try {
      await deleteRating(movie.id);
      setMovie((current) => (current ? { ...current, user_rating: null } : current));
      setSelectedRating(0);
      setStatusMessage("Avaliação removida.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível remover a avaliação");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <MoviePageSkeleton />;
  }

  if (error && !movie) {
    return <StateMessage title="Não foi possível abrir o filme" description={error} backLink="/" />;
  }

  if (!movie) {
    return <StateMessage title="Filme indisponível" description="Tente novamente em instantes." backLink="/" />;
  }

  const hasRating = typeof movie.user_rating === "number";

  // Monta a faixa superior com navegação entre telas relacionadas ao filme.
  const breadcrumb = (
    <div className="breadcrumb">
      <Link to="/">Busca</Link>
      <span> / </span>
      <Link to="/rated">Avaliados</Link>
    </div>
  );

  // Reúne o cabeçalho com título, data de lançamento e status de avaliação.
  const detailHeader = (
    <div className="detail-layout__header">
      <span className="eyebrow">Detalhes do filme</span>
      <h1>{movie.title}</h1>
      <p className="detail-layout__meta">
        <span>{formatReleaseDate(movie.release_date)}</span>
        {hasRating ? <span className="badge badge--accent">Já avaliado</span> : <span className="badge">Sem nota</span>}
      </p>
    </div>
  );

  // Prepara o bloco de sinopse com fallback para quando o texto estiver vazio.
  const synopsisPanel = (
    <div className="panel">
      <h2>Sinopse</h2>
      <p>{movie.overview || "Sinopse indisponível."}</p>
    </div>
  );

  // Renderiza a lista de elenco quando houver membros retornados pela API.
  const castPanel = (
    <div className="panel">
      <h2>Elenco</h2>
      {movie.cast.length > 0 ? (
        <ul className="cast-list">
          {movie.cast.map((member) => (
            <li key={`${member.name}-${member.character ?? "cast"}`} className="cast-list__item">
              <strong>{member.name}</strong>
              <span>{member.character || "Sem personagem informado"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Elenco indisponível.</p>
      )}
    </div>
  );

  // Agrupa a área de avaliação com nota atual, estrelas e ações de persistência.
  const ratingPanel = (
    <div className="panel panel--rating">
      <div className="panel__header">
        <div>
          <h2>{hasRating ? "Editar avaliação" : "Avaliar filme"}</h2>
          <p>Escolha uma nota de 1 a 5 e grave no banco.</p>
        </div>

        {hasRating ? <span className="badge badge--soft">Nota atual {movie.user_rating}/5</span> : null}
      </div>

      <RatingStars value={selectedRating} onChange={setSelectedRating} size="lg" />

      <div className="panel__actions">
        <button className="button button--primary" type="button" disabled={saving || selectedRating < 1} onClick={handleSave}>
          {saving ? "Salvando..." : hasRating ? "Atualizar avaliação" : "Salvar avaliação"}
        </button>

        <button className="button button--danger" type="button" disabled={saving || !hasRating} onClick={handleDelete}>
          Remover avaliação
        </button>
      </div>

      {statusMessage ? <p className="feedback feedback--success">{statusMessage}</p> : null}
      {error ? <p className="feedback feedback--error">{error}</p> : null}
    </div>
  );

  // Encapsula o conteúdo principal da página de detalhes.
  const movieDetailContent = (
    <section className="detail-layout">
      <div className="detail-layout__media">
        <MoviePoster title={movie.title} posterUrl={movie.poster_url} className="movie-poster--detail" />
      </div>

      <div className="detail-layout__content">
        {breadcrumb}
        {detailHeader}
        {synopsisPanel}
        {castPanel}
        {ratingPanel}
      </div>
    </section>
  );

  // Define a estrutura final da página para manter o return enxuto.
  const pageContent = <div className="page">{movieDetailContent}</div>;

  return pageContent;
}

function StateMessage({
  title,
  description,
  backLink,
}: {
  title: string;
  description: string;
  backLink: string;
}) {
  return (
    <div className="page">
      <section className="empty-state empty-state--large">
        <h1>{title}</h1>
        <p>{description}</p>
        <Link className="button button--primary" to={backLink}>
          Voltar
        </Link>
      </section>
    </div>
  );
}

function MoviePageSkeleton() {
  return (
    <div className="page">
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
    </div>
  );
}
