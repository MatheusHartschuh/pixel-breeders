import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { deleteRating, listRatings } from "../api";
import { MovieCard } from "../components/MovieCard";
import type { MovieSummary, RatingRecord } from "../types";

export function RatedPage() {
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Pixel Breeders | Filmes avaliados";
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    listRatings()
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setRatings(response);
        setLoading(false);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar as avaliações");
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  async function handleDelete(movieId: number) {
    if (!window.confirm("Remover esta avaliação?")) {
      return;
    }

    try {
      await deleteRating(movieId);
      setRatings((current) => current.filter((item) => item.tmdb_id !== movieId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível remover a avaliação");
    }
  }

  const movies: MovieSummary[] = ratings.map((rating) => ({
    id: rating.tmdb_id,
    title: rating.title,
    overview: rating.overview,
    release_date: rating.release_date,
    poster_url: rating.poster_url,
    user_rating: rating.rating,
  }));

  return (
    <div className="page">
      <section className="results-section">
        <div className="section-heading">
          <div>
            <span className="section-heading__eyebrow">Biblioteca pessoal</span>
            <h1>Filmes avaliados</h1>
          </div>

          <Link className="button button--secondary" to="/">
            Voltar para a busca
          </Link>
        </div>

        <div className="stats-row">
          <div className="stats-card">
            <span className="stats-card__label">Total</span>
            <strong>{ratings.length}</strong>
          </div>
          <div className="stats-card">
            <span className="stats-card__label">Última atualização</span>
            <strong>{ratings[0] ? new Intl.DateTimeFormat("pt-BR").format(new Date(ratings[0].updated_at)) : "Sem dados"}</strong>
          </div>
        </div>

        {loading ? <RatedPageSkeleton /> : null}
        {error ? <StateMessage title="Falha ao carregar" description={error} /> : null}

        {!loading && !error && movies.length === 0 ? (
          <StateMessage
            title="Nenhuma avaliação ainda"
            description="Busque um filme na página principal, abra os detalhes e marque sua nota."
            action={<Link className="button button--primary" to="/">Ir para a busca</Link>}
          />
        ) : null}

        {!loading && !error && movies.length > 0 ? (
          <div className="movie-grid">
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                actions={
                  <button className="button button--ghost" type="button" onClick={() => handleDelete(movie.id)}>
                    Remover
                  </button>
                }
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function StateMessage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state empty-state--large">
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

function RatedPageSkeleton() {
  return (
    <div className="movie-grid">
      {Array.from({ length: 4 }, (_, index) => (
        <article className="movie-card movie-card--skeleton" key={index}>
          <div className="movie-card__media skeleton skeleton--poster" />
          <div className="movie-card__body">
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line skeleton--short" />
            <div className="skeleton skeleton--paragraph" />
          </div>
        </article>
      ))}
    </div>
  );
}
