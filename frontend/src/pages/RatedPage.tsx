import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import { deleteRating, listRatings } from "../api";
import { EmptyState } from "../components/layout/EmptyState";
import { Page } from "../components/layout/Page";
import { SectionHeader } from "../components/layout/SectionHeader";
import { Button } from "../components/ui/Button";
import { MovieCard } from "../components/MovieCard";
import type { MovieSummary, RatingRecord } from "../types";

export function RatedPage() {
  const { user, isCheckingSession, logout } = useAuth();
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const nextPath = encodeURIComponent("/rated");

  useEffect(() => {
    document.title = "Pixel Breeders | Filmes avaliados";
  }, []);

  useEffect(() => {
    if (isCheckingSession) {
      return;
    }

    if (!user) {
      setRatings([]);
      setLoading(false);
      setError("");
      return;
    }

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

        const message = requestError instanceof Error ? requestError.message : "Não foi possível carregar as avaliações";
        if (message.includes("Autenticação obrigatória") || message.includes("Token inválido ou expirado")) {
          logout();
          setRatings([]);
          setLoading(false);
          setError("");
          return;
        }

        setError(message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [isCheckingSession, user, logout]);

  async function handleDelete(movieId: number) {
    if (!user) {
      return;
    }

    if (!window.confirm("Remover esta avaliação?")) {
      return;
    }

    try {
      await deleteRating(movieId);
      setRatings((current) => current.filter((item) => item.tmdb_id !== movieId));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Não foi possível remover a avaliação";
      if (message.includes("Autenticação obrigatória") || message.includes("Token inválido ou expirado")) {
        logout();
      }
      setError(message);
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

  const statsRow = (
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
  );

  const pageState = (() => {
    if (isCheckingSession) {
      return <RatedPageSkeleton />;
    }

    if (!user) {
      return (
        <EmptyState
          title="Entre para ver suas avaliações"
          description="O login libera a lista pessoal de filmes avaliados e mantém suas notas separadas de outras contas."
          titleAs="h2"
          size="large"
          action={
            <div className="auth-page__links">
              <Button variant="primary" to={`/login?next=${nextPath}`}>
                Entrar
              </Button>
              <Button variant="secondary" to={`/register?next=${nextPath}`}>
                Criar conta
              </Button>
            </div>
          }
        />
      );
    }

    if (loading) {
      return <RatedPageSkeleton />;
    }

    if (error) {
      return <EmptyState title="Falha ao carregar" description={error} titleAs="h2" size="large" />;
    }

    if (movies.length === 0) {
      return (
        <EmptyState
          title="Nenhuma avaliação ainda"
          description="Busque um filme na página principal, abra os detalhes e marque sua nota."
          titleAs="h2"
          size="large"
          action={<Button variant="primary" to="/">Ir para a busca</Button>}
        />
      );
    }

    return (
      <div className="movie-grid">
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            actions={
              <Button variant="ghost" type="button" onClick={() => handleDelete(movie.id)}>
                Remover
              </Button>
            }
          />
        ))}
      </div>
    );
  })();

  return (
    <Page>
      <section className="results-section">
        <SectionHeader
          eyebrow="Biblioteca pessoal"
          title="Filmes avaliados"
          titleAs="h1"
          actions={
            <Button variant="secondary" to="/">
              Voltar para a busca
            </Button>
          }
        />
        {user ? statsRow : null}
        {pageState}
      </section>
    </Page>
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
