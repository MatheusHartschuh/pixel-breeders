import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { searchMovies } from "../api";
import { MovieCard } from "../components/MovieCard";
import type { MovieSummary } from "../types";

const FEATURED_QUERIES = ["The Matrix", "Interstellar", "Parasite", "Whiplash"];
const GENRE_OPTIONS = [
  { id: 28, label: "Ação" },
  { id: 12, label: "Aventura" },
  { id: 16, label: "Animação" },
  { id: 35, label: "Comédia" },
  { id: 80, label: "Crime" },
  { id: 18, label: "Drama" },
  { id: 14, label: "Fantasia" },
  { id: 27, label: "Terror" },
  { id: 9648, label: "Mistério" },
  { id: 10749, label: "Romance" },
  { id: 878, label: "Ficção científica" },
  { id: 53, label: "Thriller" },
] as const;

type SearchStatus = "idle" | "typing" | "loading" | "success" | "empty" | "error";
type SearchMode = "pagination" | "infinite";

const YEAR_MIN = 1900;
const YEAR_MAX = 2100;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialYear = searchParams.get("year") ?? "";
  const initialGenre = searchParams.get("genre") ?? "";
  const initialMode = searchParams.get("mode") === "infinite" ? "infinite" : "pagination";

  const [draft, setDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [yearInput, setYearInput] = useState(initialYear);
  const [genreId, setGenreId] = useState(initialGenre);
  const [items, setItems] = useState<MovieSummary[]>([]);
  const [status, setStatus] = useState<SearchStatus>(initialQuery || initialYear || initialGenre ? "loading" : "idle");
  const [error, setError] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.title = "Pixel Breeders | Busca de filmes";
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(draft.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [draft]);

  const trimmedQuery = query.trim();
  const normalizedYear = normalizeYear(yearInput);
  const selectedGenreId = genreId ? Number(genreId) : undefined;
  const hasActiveFilters = normalizedYear !== undefined || selectedGenreId !== undefined;
  const hasSearch = trimmedQuery.length >= 2 || hasActiveFilters;
  const hasMorePages = hasSearch && totalPages > 0 && currentPage < totalPages;
  const yearIsPending = yearInput.trim().length > 0 && normalizedYear === undefined;

  function resetResults(nextStatus: SearchStatus) {
    abortRef.current?.abort();
    abortRef.current = null;
    setItems([]);
    setError("");
    setResultCount(0);
    setCurrentPage(0);
    setTotalPages(0);
    setIsLoadingMore(false);
    setStatus(nextStatus);
  }

  async function loadPage(targetQuery: string, page: number, append: boolean) {
    const effectiveQuery = targetQuery.trim();
    const searchAllowed = effectiveQuery.length === 0 || effectiveQuery.length >= 2;
    if (!searchAllowed) {
      return;
    }
    if (!effectiveQuery && !hasActiveFilters) {
      return;
    }

    const existingItemCount = items.length;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setItems([]);
      setStatus("loading");
    }

    setError("");

    try {
      const response = await searchMovies(effectiveQuery, page, controller.signal, {
        year: normalizedYear,
        genreId: selectedGenreId,
      });

      if (controller.signal.aborted) {
        return;
      }

      setResultCount(response.total_results);
      setCurrentPage(response.page);
      setTotalPages(response.total_pages);
      setItems((current) => (append ? [...current, ...response.items] : response.items));

      if (append) {
        setStatus(response.items.length > 0 || existingItemCount > 0 ? "success" : "empty");
      } else {
        setStatus(response.items.length > 0 ? "success" : "empty");
      }
    } catch (requestError) {
      if (controller.signal.aborted) {
        return;
      }

      const message = requestError instanceof Error ? requestError.message : "Falha ao buscar filmes";
      if (append && existingItemCount > 0) {
        setError(message);
        setStatus("success");
      } else {
        setItems([]);
        setResultCount(0);
        setCurrentPage(0);
        setTotalPages(0);
        setError(message);
        setStatus("error");
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }

      if (append) {
        setIsLoadingMore(false);
      }
    }
  }

  useEffect(() => {
    if (yearIsPending) {
      return;
    }

    if (!trimmedQuery && !hasActiveFilters) {
      resetResults("idle");
      return;
    }

    if (trimmedQuery.length > 0 && trimmedQuery.length < 2) {
      resetResults("typing");
      return;
    }

    void loadPage(trimmedQuery, 1, false);
  }, [trimmedQuery, normalizedYear, selectedGenreId, yearIsPending, mode]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }
    if (yearInput.trim()) {
      params.set("year", yearInput.trim());
    }
    if (genreId) {
      params.set("genre", genreId);
    }
    if (mode === "infinite") {
      params.set("mode", mode);
    }
    setSearchParams(params, { replace: true });
  }, [trimmedQuery, yearInput, genreId, mode, setSearchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft.trim());
  }

  function handleSuggestion(value: string) {
    setDraft(value);
    setQuery(value);
  }

  function handleLoadMore() {
    if (!hasSearch || status !== "success" || isLoadingMore || currentPage >= totalPages) {
      return;
    }

    void loadPage(trimmedQuery, currentPage + 1, true);
  }

  function handleClearAll() {
    setDraft("");
    setQuery("");
    setYearInput("");
    setGenreId("");
  }

  function handleYearChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 4);
    setYearInput(digitsOnly);
  }

  const featuredQueryChips = FEATURED_QUERIES.map((queryName) => (
    <button key={queryName} type="button" className="chip" onClick={() => handleSuggestion(queryName)}>
      {queryName}
    </button>
  ));

  const resultsState = (() => {
    if (status === "loading" && items.length === 0) {
      return <MovieGridSkeleton />;
    }

    if (status === "error" && items.length === 0) {
      return <StateMessage title="Falha na busca" description={error} />;
    }

    if (status === "typing") {
      return (
        <StateMessage
          title="Continue digitando"
          description="A busca começa com pelo menos 2 caracteres para evitar chamadas desnecessárias."
        />
      );
    }

    if (status === "idle") {
      return (
        <StateMessage
          title="Experimente uma busca"
          description="Use os atalhos, filtre por ano ou gênero, ou procure diretamente por qualquer filme do TMDB."
        />
      );
    }

    if (status === "empty") {
      return (
        <StateMessage
          title="Nenhum filme encontrado"
          description="Tente outro título ou ajuste os filtros de ano e gênero."
        />
      );
    }

    return null;
  })();

  const paginationErrorNotice = status === "success" && error && items.length > 0 ? (
    <div className="inline-notice inline-notice--error">
      <strong>Não foi possível carregar a próxima página.</strong>
      <span>{error}</span>
    </div>
  ) : null;

  const paginationBar =
    mode === "pagination" && status === "success" && items.length > 0 && totalPages > 1 ? (
      <div className="pagination-bar">
        <button
          className="button button--secondary"
          type="button"
          disabled={currentPage <= 1 || isLoadingMore}
          onClick={() => void loadPage(trimmedQuery, currentPage - 1, false)}
        >
          Anterior
        </button>

        <span className="pagination-bar__meta">
          Página {currentPage} de {totalPages}
        </span>

        <button
          className="button button--secondary"
          type="button"
          disabled={currentPage >= totalPages || isLoadingMore}
          onClick={() => void loadPage(trimmedQuery, currentPage + 1, false)}
        >
          Próxima
        </button>
      </div>
    ) : null;

  const infiniteFooter = mode === "infinite" && status === "success" && items.length > 0 ? (
    <div className="infinite-footer">
      <div ref={sentinelRef} className="infinite-footer__sentinel" aria-hidden="true" />
      {hasMorePages ? (
        <button className="button button--secondary" type="button" onClick={handleLoadMore} disabled={isLoadingMore}>
          {isLoadingMore ? "Carregando..." : "Carregar mais"}
        </button>
      ) : (
        <p className="infinite-footer__end">Você chegou ao fim dos resultados.</p>
      )}
    </div>
  ) : null;

  useEffect(() => {
    if (mode !== "infinite" || status !== "success" || !hasMorePages || isLoadingMore) {
      return;
    }

    const target = sentinelRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          handleLoadMore();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMorePages, isLoadingMore, mode, status, currentPage, totalPages, trimmedQuery, selectedGenreId, normalizedYear]);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__content">
          <span className="eyebrow">MVP sem login</span>
          <h1>Busque, filtre e revise seus filmes favoritos.</h1>
          <p>
            Um fluxo simples e direto: pesquisa via TMDB, detalhes do filme, nota de 1 a 5, página de avaliados e
            agora também filtros por ano e gênero.
          </p>
        </div>

        <div className="hero__panel">
          <form className="search-box" onSubmit={handleSubmit}>
            <label className="search-box__label" htmlFor="movie-search">
              Procurar filme
            </label>
            <div className="search-box__row">
              <input
                id="movie-search"
                className="search-box__input"
                type="search"
                placeholder="Ex.: The Matrix, Parasite, Interstellar..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                autoComplete="off"
              />
              <button className="button button--primary" type="submit">
                Buscar
              </button>
            </div>
          </form>

          <div className="search-filters">
            <label className="search-filters__field">
              <span>Ano de lançamento</span>
              <input
                className="search-filters__input"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="2024"
                value={yearInput}
                onChange={(event) => handleYearChange(event.target.value)}
              />
            </label>

            <label className="search-filters__field">
              <span>Gênero</span>
              <select
                className="search-filters__input"
                value={genreId}
                onChange={(event) => setGenreId(event.target.value)}
              >
                <option value="">Todos os gêneros</option>
                {GENRE_OPTIONS.map((genre) => (
                  <option key={genre.id} value={genre.id}>
                    {genre.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="search-box__chips">{featuredQueryChips}</div>

          <div className="hero__links">
            <Link className="button button--secondary" to="/rated">
              Ver filmes avaliados
            </Link>
            <button className="button button--ghost" type="button" onClick={handleClearAll}>
              Limpar busca e filtros
            </button>
          </div>
        </div>
      </section>

      <section className="results-section">
        <div className="section-heading">
          <div>
            <span className="section-heading__eyebrow">Resultados</span>
            <h2>{hasSearch ? `Encontramos ${resultCount} filmes` : "Digite algo ou aplique filtros"}</h2>
          </div>

          <div className="results-toolbar">
            <div className="segmented-control" role="tablist" aria-label="Modo de navegação dos resultados">
              <button
                type="button"
                className={`segmented-control__button ${mode === "pagination" ? "is-active" : ""}`}
                aria-pressed={mode === "pagination"}
                onClick={() => setMode("pagination")}
              >
                Paginação
              </button>
              <button
                type="button"
                className={`segmented-control__button ${mode === "infinite" ? "is-active" : ""}`}
                aria-pressed={mode === "infinite"}
                onClick={() => setMode("infinite")}
              >
                Scroll infinito
              </button>
            </div>

            {hasSearch ? (
              <button type="button" className="text-button" onClick={handleClearAll}>
                Limpar tudo
              </button>
            ) : null}
          </div>
        </div>

        {hasSearch ? (
          <div className="results-summary">
            <span>
              Página {currentPage || 1}
              {totalPages > 0 ? ` de ${totalPages}` : ""}
            </span>
            <span>
              {mode === "pagination" ? "Modo paginado" : "Modo scroll infinito"}
              {normalizedYear ? ` · Ano ${normalizedYear}` : ""}
              {selectedGenreId ? ` · Gênero ${genreLabel(selectedGenreId)}` : ""}
            </span>
          </div>
        ) : null}

        {resultsState}

        {status === "success" && items.length > 0 ? (
          <div className="movie-grid">
            {items.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : null}

        {paginationErrorNotice}
        {paginationBar}
        {infiniteFooter}
      </section>
    </div>
  );
}

function normalizeYear(value: string): number | undefined {
  if (value.trim().length !== 4) {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < YEAR_MIN || parsed > YEAR_MAX) {
    return undefined;
  }

  return parsed;
}

function genreLabel(genreId: number): string {
  const found = GENRE_OPTIONS.find((genre) => genre.id === genreId);
  return found?.label ?? String(genreId);
}

function StateMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function MovieGridSkeleton() {
  return (
    <div className="movie-grid">
      {Array.from({ length: 6 }, (_, index) => (
        <article className="movie-card movie-card--skeleton" key={index}>
          <div className="movie-card__media skeleton skeleton--poster" />
          <div className="movie-card__body">
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line skeleton--short" />
            <div className="skeleton skeleton--paragraph" />
            <div className="skeleton skeleton--line skeleton--short" />
          </div>
        </article>
      ))}
    </div>
  );
}
