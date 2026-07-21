import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import { deleteRating, listRatings } from "../api";
import { MovieCard } from "../components/MovieCard";
import { EmptyState } from "../components/layout/EmptyState";
import { Page } from "../components/layout/Page";
import { SectionHeader } from "../components/layout/SectionHeader";
import { Button } from "../components/ui/Button";
import { formatEvaluationDate } from "../lib/format";
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

        const message = requestError instanceof Error ? requestError.message : "Nao foi possivel carregar as avaliacoes";
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

    if (!window.confirm("Remover esta avaliacao?")) {
      return;
    }

    try {
      await deleteRating(movieId);
      setRatings((current) => current.filter((item) => item.tmdb_id !== movieId));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Nao foi possivel remover a avaliacao";
      if (message.includes("Autenticação obrigatória") || message.includes("Token inválido ou expirado")) {
        logout();
      }
      setError(message);
    }
  }

  const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length : 0;
  const summary = user ? (
    <div className="collection-summary" aria-label="Resumo da colecao">
      <span>{ratings.length} filmes</span>
      <span>{ratings.length > 0 ? `Media ${averageRating.toFixed(1)}/5` : "Sem media ainda"}</span>
      <span>{ratings[0] ? `Ultima entrada ${formatEvaluationDate(ratings[0].created_at)}` : "Sem registros"}</span>
    </div>
  ) : null;

  const pageState = (() => {
    if (isCheckingSession) {
      return <RatedPageSkeleton />;
    }

    if (!user) {
      return (
        <EmptyState
          title="Entre para ver sua colecao"
          description="O login libera a lista pessoal de filmes avaliados e mantem suas notas separadas por conta."
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

    if (error && ratings.length === 0) {
      return <EmptyState title="Falha ao carregar" description={error} titleAs="h2" size="large" />;
    }

    if (ratings.length === 0) {
      return (
        <EmptyState
          title="Sua estante ainda esta vazia"
          description="Busque um filme na pagina principal, abra os detalhes e salve sua primeira nota."
          titleAs="h2"
          size="large"
          action={<Button variant="primary" to="/">Ir para a busca</Button>}
        />
      );
    }

    return (
      <>
        {error ? <p className="collection-notice collection-notice--error">{error}</p> : null}
        <div className="movie-grid">
          {ratings.map((rating) => (
            <MovieCard
              key={rating.tmdb_id}
              movie={
                {
                  id: rating.tmdb_id,
                  title: rating.title,
                  overview: rating.overview,
                  release_date: rating.release_date,
                  poster_url: rating.poster_url,
                  user_rating: rating.rating,
                } satisfies MovieSummary
              }
              ratingDate={formatEvaluationDate(rating.created_at)}
              actions={
                <Button variant="text" type="button" onClick={() => handleDelete(rating.tmdb_id)}>
                  Remover
                </Button>
              }
            />
          ))}
        </div>
      </>
    );
  })();

  return (
    <Page className="rated-page">
      <section className="results-section">
        <SectionHeader
          eyebrow="Biblioteca pessoal"
          title="Filmes avaliados"
          titleAs="h1"
          actions={
            <Button variant="text" to="/">
              Voltar para a busca
            </Button>
          }
        />

        {summary}
        {pageState}
      </section>
    </Page>
  );
}

function RatedPageSkeleton() {
  return (
    <div className="movie-grid">
      {Array.from({ length: 6 }, (_, index) => (
        <article className="movie-card movie-card--skeleton" key={index}>
          <div className="movie-card__link">
            <div className="movie-card__poster">
              <div className="skeleton skeleton--poster" />
            </div>
            <div className="movie-card__body">
              <div className="skeleton skeleton--line skeleton--title" />
              <div className="skeleton skeleton--line skeleton--short" />
              <div className="skeleton skeleton--chips" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
