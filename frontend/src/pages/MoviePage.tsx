import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { AuthPromptModal } from "../components/auth/AuthPromptModal";
import { createRating, deleteRating, getMovie, isUnauthorizedError, updateRating } from "../api";
import { EmptyState } from "../components/layout/EmptyState";
import { Page } from "../components/layout/Page";
import { MovieDetailSkeleton, MovieDetailView } from "../components/movie/MovieDetailView";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ptBR } from "../i18n";
import type { MovieDetail } from "../types";

export function MoviePage() {
  const params = useParams();
  const location = useLocation();
  const { user, isCheckingSession, logout } = useAuth();
  const movieId = Number(params.movieId);
  const nextPath = encodeURIComponent(`${location.pathname}${location.search}`);

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [isDeletePromptOpen, setIsDeletePromptOpen] = useState(false);

  useEffect(() => {
    document.title = movie ? ptBR.movie.documentTitle(movie.title) : ptBR.movie.documentTitle();
  }, [movie]);

  useEffect(() => {
    if (Number.isNaN(movieId)) {
      setMovie(null);
      setSelectedRating(0);
      setError(ptBR.movie.fallback.invalidId);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setMovie(null);
    setSelectedRating(0);
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

        setError(requestError instanceof Error ? requestError.message : ptBR.common.feedback.genericLoadMovieError);
        setLoading(false);
      });

    return () => controller.abort();
  }, [movieId]);

  async function handleSave() {
    if (!movie || selectedRating < 1) {
      return;
    }

    if (!user) {
      setIsAuthPromptOpen(true);
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

      const savedRating = movie.user_rating ? await updateRating(movie.id, selectedRating) : await createRating(payload);

      setMovie((current) => (current ? { ...current, user_rating: savedRating.rating } : current));
      setStatusMessage(ptBR.movie.copies.saveSuccess);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : ptBR.common.feedback.genericSaveRatingError;
      if (isUnauthorizedError(requestError)) {
        logout();
        setIsAuthPromptOpen(true);
        setMovie((current) => (current ? { ...current, user_rating: null } : current));
        setStatusMessage("");
        setSelectedRating(0);
        setError("");
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!movie?.user_rating) {
      return;
    }

    if (!user) {
      setIsAuthPromptOpen(true);
      return;
    }

    setIsDeletePromptOpen(true);
  }

  async function confirmDelete() {
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
      setStatusMessage(ptBR.movie.copies.removedSuccess);
      setIsDeletePromptOpen(false);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : ptBR.common.feedback.genericDeleteRatingError;
      if (isUnauthorizedError(requestError)) {
        logout();
        setIsDeletePromptOpen(false);
        setIsAuthPromptOpen(true);
        setMovie((current) => (current ? { ...current, user_rating: null } : current));
        setSelectedRating(0);
        setError("");
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <MovieDetailSkeleton />;
  }

  if (error && !movie) {
    return (
      <Page>
        <EmptyState
          title={ptBR.movie.fallback.unavailable}
          description={error}
          titleAs="h1"
          size="large"
          action={
            <Button variant="primary" to="/">
              {ptBR.common.buttons.back}
            </Button>
          }
        />
      </Page>
    );
  }

  if (!movie) {
    return (
      <Page>
        <EmptyState
          title={ptBR.movie.fallback.unavailable}
          description={ptBR.movie.fallback.tryAgain}
          titleAs="h1"
          size="large"
          action={
            <Button variant="primary" to="/">
              {ptBR.common.buttons.back}
            </Button>
          }
        />
      </Page>
    );
  }

  return (
    <>
      <MovieDetailView
        movie={movie}
        selectedRating={selectedRating}
        onRatingChange={setSelectedRating}
        onSave={handleSave}
        onDelete={handleDelete}
        onRequestLogin={() => setIsAuthPromptOpen(true)}
        saving={saving}
        statusMessage={statusMessage}
        error={error}
        user={user}
        isCheckingSession={isCheckingSession}
      />
      <AuthPromptModal
        open={isAuthPromptOpen}
        nextPath={nextPath}
        contextLabel={movie ? movie.title : undefined}
        onClose={() => setIsAuthPromptOpen(false)}
      />
      <ConfirmDialog
        open={isDeletePromptOpen}
        title={ptBR.common.dialogs.removeRatingTitle}
        description={ptBR.common.dialogs.removeRatingDescription}
        confirmLabel={ptBR.movie.buttons.remove}
        cancelLabel={ptBR.common.buttons.cancel}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setIsDeletePromptOpen(false)}
      />
    </>
  );
}
