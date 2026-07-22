import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthProvider";
import { deleteRating, isUnauthorizedError, listRatings } from "../api";
import { MovieCard } from "../components/MovieCard";
import { EmptyState } from "../components/layout/EmptyState";
import { Page } from "../components/layout/Page";
import { SectionHeader } from "../components/layout/SectionHeader";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { formatEvaluationDate } from "../lib/format";
import { ptBR } from "../i18n";
import type { MovieSummary, RatingRecord } from "../types";

export function RatedPage() {
  const { user, isCheckingSession, logout } = useAuth();
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<RatingRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const nextPath = encodeURIComponent("/rated");

  useEffect(() => {
    document.title = ptBR.rated.documentTitle;
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

        const message = requestError instanceof Error ? requestError.message : ptBR.common.feedback.genericLoadRatingsError;
        if (isUnauthorizedError(requestError)) {
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
  }, [user, isCheckingSession, logout]);

  function handleDeleteRequest(rating: RatingRecord) {
    if (!user) {
      return;
    }

    setPendingDelete(rating);
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteRating(pendingDelete.tmdb_id);
      setRatings((current) => current.filter((item) => item.tmdb_id !== pendingDelete.tmdb_id));
      setPendingDelete(null);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : ptBR.common.feedback.genericDeleteRatingError;
      if (isUnauthorizedError(requestError)) {
        logout();
        setPendingDelete(null);
        setRatings([]);
        setLoading(false);
        setError("");
        return;
      }
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length : 0;
  const summary = user ? (
    <div className="collection-summary" aria-label={ptBR.rated.summary.ariaLabel}>
      <div className="collection-summary__item">
        <span className="collection-summary__label">{ptBR.rated.summary.filmsLabel}</span>
        <strong className="collection-summary__value">{ratings.length}</strong>
      </div>
      <div className="collection-summary__item">
        <span className="collection-summary__label">{ptBR.rated.summary.averagePrefix}</span>
        <strong className="collection-summary__value">
          {ratings.length > 0 ? `${averageRating.toFixed(1)}/5.0` : ptBR.rated.summary.noAverage}
        </strong>
      </div>
      <div className="collection-summary__item">
        <span className="collection-summary__label">{ptBR.rated.summary.lastEntryPrefix}</span>
        <strong className="collection-summary__value">
          {ratings[0] ? formatEvaluationDate(ratings[0].created_at) : ptBR.rated.summary.noRecords}
        </strong>
      </div>
    </div>
  ) : null;

  const pageState = (() => {
    if (isCheckingSession) {
      return <RatedPageSkeleton />;
    }

    if (!user) {
      return (
        <EmptyState
          title={ptBR.rated.states.loggedOutTitle}
          description={ptBR.rated.states.loggedOutDescription}
          titleAs="h2"
          size="large"
          action={
            <div className="auth-page__links">
              <Button variant="primary" to={`/login?next=${nextPath}`}>
                {ptBR.app.rail.signIn}
              </Button>
              <Button variant="secondary" to={`/register?next=${nextPath}`}>
                {ptBR.app.rail.createAccount}
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
      return <EmptyState title={ptBR.rated.states.failureTitle} description={error} titleAs="h2" size="large" />;
    }

    if (ratings.length === 0) {
      return (
        <EmptyState
          title={ptBR.rated.states.emptyTitle}
          description={ptBR.rated.states.emptyDescription}
          titleAs="h2"
          size="large"
          action={<Button variant="primary" to="/">{ptBR.common.buttons.backToSearch}</Button>}
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
              showTmdbScore={false}
              actions={
                <Button variant="text" className="text-button--danger" type="button" onClick={() => handleDeleteRequest(rating)}>
                  {ptBR.rated.actions.delete}
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
          eyebrow={ptBR.rated.section.eyebrow}
          title={ptBR.rated.section.title}
          titleAs="h1"
          actions={
            <Button variant="text" to="/">
              {ptBR.rated.section.backToSearch}
            </Button>
          }
        />

        {summary}
        {pageState}
        <ConfirmDialog
          open={pendingDelete !== null}
          title={ptBR.common.dialogs.removeRatingTitle}
          description={ptBR.common.dialogs.removeRatingDescription}
          confirmLabel={ptBR.rated.actions.delete}
          cancelLabel={ptBR.common.buttons.cancel}
          loading={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
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
