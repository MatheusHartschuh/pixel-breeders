import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { searchMovies } from "../api";
import { MovieCard } from "../components/MovieCard";
import { EmptyState } from "../components/layout/EmptyState";
import { DataSourceBanner } from "../components/layout/DataSourceBanner";
import { Page } from "../components/layout/Page";
import { SectionHeader } from "../components/layout/SectionHeader";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { formatReleaseYear } from "../lib/format";
import type { DataSource, MovieSummary } from "../types";

const GENRE_OPTIONS = [
  { id: 28, label: "Acao" },
  { id: 12, label: "Aventura" },
  { id: 16, label: "Animacao" },
  { id: 35, label: "Comedia" },
  { id: 80, label: "Crime" },
  { id: 18, label: "Drama" },
  { id: 14, label: "Fantasia" },
  { id: 27, label: "Terror" },
  { id: 9648, label: "Misterio" },
  { id: 10749, label: "Romance" },
  { id: 878, label: "Ficcao cientifica" },
  { id: 53, label: "Thriller" },
] as const;
const SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "recent", label: "Recentes" },
  { value: "rating", label: "Melhor TMDB" },
  { value: "title", label: "Titulo" },
] as const;

type SearchStatus = "idle" | "typing" | "loading" | "success" | "empty" | "error";
type SearchMode = "pagination" | "infinite";
type SortMode = (typeof SORT_OPTIONS)[number]["value"];

const YEAR_MIN = 1900;
const YEAR_MAX = 2100;

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialYear = searchParams.get("year") ?? "";
  const initialGenre = searchParams.get("genre") ?? "";
  const initialMode = searchParams.get("mode") === "infinite" ? "infinite" : "pagination";
  const initialSort = searchParams.get("sort") ?? "relevance";
  const initialSortMode = isSortMode(initialSort) ? initialSort : "relevance";
  const initialStatus =
    initialQuery.length > 0 && initialQuery.length < 2 && !initialYear && !initialGenre ? "typing" : "loading";

  const [draft, setDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [yearInput, setYearInput] = useState(initialYear);
  const [genreId, setGenreId] = useState(initialGenre);
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [sortMode, setSortMode] = useState<SortMode>(initialSortMode);
  const [items, setItems] = useState<MovieSummary[]>([]);
  const [status, setStatus] = useState<SearchStatus>(initialStatus);
  const [error, setError] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.title = "Pixel Breeders | Busca de filmes";
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(draft.trim());
    }, 320);

    return () => window.clearTimeout(timeout);
  }, [draft]);

  const trimmedQuery = query.trim();
  const normalizedYear = normalizeYear(yearInput);
  const selectedGenreId = genreId ? Number(genreId) : undefined;
  const hasActiveFilters = normalizedYear !== undefined || selectedGenreId !== undefined;
  const hasSearch = trimmedQuery.length >= 2 || hasActiveFilters;
  const hasMorePages = totalPages > 0 && currentPage < totalPages;
  const yearIsPending = yearInput.trim().length > 0 && normalizedYear === undefined;
  const visibleItems = sortMovies(items, sortMode);
  const sortLabel = getSortLabel(sortMode);
  const activeTokens = buildActiveTokens(trimmedQuery, normalizedYear, selectedGenreId, sortLabel);
  const isInitialDiscovery = !hasSearch;

  function resetResults(nextStatus: SearchStatus) {
    abortRef.current?.abort();
    abortRef.current = null;
    setItems([]);
    setError("");
    setResultCount(0);
    setCurrentPage(0);
    setTotalPages(0);
    setIsLoadingMore(false);
    setDataSource(null);
    setStatus(nextStatus);
  }

  async function loadPage(targetQuery: string, page: number, append: boolean) {
    const effectiveQuery = targetQuery.trim();
    const searchAllowed = effectiveQuery.length === 0 || effectiveQuery.length >= 2;
    if (!searchAllowed) {
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
      setDataSource(null);
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
      setDataSource(response.source);
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
        setDataSource(null);
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

    if (trimmedQuery.length > 0 && trimmedQuery.length < 2) {
      resetResults("typing");
      return;
    }

    void loadPage(trimmedQuery, 1, false);
  }, [trimmedQuery, normalizedYear, selectedGenreId, yearIsPending, hasActiveFilters]);

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
    if (sortMode !== "relevance") {
      params.set("sort", sortMode);
    }
    setSearchParams(params, { replace: true });
  }, [trimmedQuery, yearInput, genreId, mode, sortMode, setSearchParams]);

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
  }, [mode, hasMorePages, isLoadingMore, status, currentPage, totalPages, trimmedQuery, selectedGenreId, normalizedYear]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft.trim());
  }

  function handleLoadMore() {
    if (status !== "success" || isLoadingMore || currentPage >= totalPages) {
      return;
    }

    void loadPage(trimmedQuery, currentPage + 1, true);
  }

  function handleClearAll() {
    setDraft("");
    setQuery("");
    setYearInput("");
    setGenreId("");
    setSortMode("relevance");
  }

  function handleYearChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 4);
    setYearInput(digitsOnly);
  }

  const resultsState = (() => {
    if (status === "loading" && items.length === 0) {
      return <MovieGridSkeleton />;
    }

    if (status === "error" && items.length === 0) {
      return <EmptyState title="Falha na busca" description={error} titleAs="h3" />;
    }

    if (status === "typing") {
      return (
        <EmptyState
          title="Continue digitando"
          description="A busca comeca quando ha pelo menos 2 caracteres. Ano e genero continuam funcionando sozinhos."
          titleAs="h3"
        />
      );
    }

    if (status === "empty") {
      return (
        <EmptyState
          title="Nenhum filme encontrado"
          description="Tente outro titulo ou ajuste ano, genero e ordenacao."
          titleAs="h3"
        />
      );
    }

    return null;
  })();

  const loadMoreFooter =
    mode === "infinite" && status === "success" && visibleItems.length > 0 ? (
      <div className="infinite-footer">
        <div ref={sentinelRef} className="infinite-footer__sentinel" aria-hidden="true" />
        {hasMorePages ? (
          <Button variant="secondary" type="button" onClick={handleLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Carregando..." : "Carregar mais"}
          </Button>
        ) : (
          <p className="infinite-footer__end">Fim da lista. Ajuste os filtros para abrir outra trilha.</p>
        )}
      </div>
    ) : null;

  return (
    <Page className="home-page">
      <section className="search-intro">
        <span className="eyebrow">Busca editorial</span>
        <h1>Pesquise filmes, refine a descoberta e salve sua propria colecao.</h1>
        <p>
          Uma interface pensada para cinéfilos: busca direta, filtros discretos, resultados amplos e avaliacao
          pessoal no mesmo fluxo.
        </p>
      </section>

      <section className="search-console" aria-label="Busca de filmes">
        <form className="search-bar" onSubmit={handleSubmit}>
          <label className="search-bar__label" htmlFor="movie-search">
            Procurar filme
          </label>
          <div className="search-bar__row">
            <span className="search-bar__icon" aria-hidden="true" />
            <input
              id="movie-search"
              className="search-bar__input"
              type="search"
              placeholder="Ex.: The Matrix, Parasite, Interstellar..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoComplete="off"
            />
            <Button variant="primary" type="submit">
              Buscar
            </Button>
          </div>
        </form>

        <div className="search-tools">
          <Field variant="filter" label="Ano">
            <input
              className="search-filters__input"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="2024"
              value={yearInput}
              onChange={(event) => handleYearChange(event.target.value)}
            />
          </Field>

          <Field variant="filter" label="Genero">
            <select className="search-filters__input" value={genreId} onChange={(event) => setGenreId(event.target.value)}>
              <option value="">Todos os generos</option>
              {GENRE_OPTIONS.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="search-tools__sort">
            <span className="search-tools__label">Ordenacao</span>
            <SegmentedControl<SortMode>
              ariaLabel="Ordenacao dos resultados"
              value={sortMode}
              onChange={setSortMode}
              options={SORT_OPTIONS}
            />
          </div>
        </div>
      </section>

      <section className="results-section">
        <DataSourceBanner source={dataSource} />
        <SectionHeader
          eyebrow={isInitialDiscovery ? "Entradas iniciais" : "Resultados"}
          title={
            status === "loading"
              ? isInitialDiscovery
                ? "Carregando catalogo"
                : "Buscando filmes"
              : isInitialDiscovery
                ? `${resultCount} filmes em destaque`
                : `${resultCount} filmes encontrados`
          }
          titleAs="h2"
          actions={
            <div className="results-toolbar">
              <SegmentedControl<SearchMode>
                ariaLabel="Modo de navegação dos resultados"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "pagination", label: "Paginação" },
                  { value: "infinite", label: "Scroll ilimitado" },
                ]}
              />
              {(hasSearch || resultCount > 0) ? (
                <Button variant="text" type="button" onClick={handleClearAll}>
                  Limpar filtros
                </Button>
              ) : null}
            </div>
          }
        />

        {hasSearch ? (
          <div className="results-summary">
            {activeTokens.map((token) => (
              <span key={token} className="results-summary__token">
                {token}
              </span>
            ))}
          </div>
        ) : null}

        {resultsState}

        {status === "success" && visibleItems.length > 0 ? (
          <div className="movie-grid">
            {visibleItems.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : null}

        {mode === "pagination" && status === "success" && visibleItems.length > 0 && totalPages > 1 ? (
          <div className="pagination-bar">
            <Button
              variant="secondary"
              type="button"
              disabled={currentPage <= 1 || isLoadingMore}
              onClick={() => void loadPage(trimmedQuery, currentPage - 1, false)}
            >
              Anterior
            </Button>
            <span className="pagination-bar__meta">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="secondary"
              type="button"
              disabled={currentPage >= totalPages || isLoadingMore}
              onClick={() => void loadPage(trimmedQuery, currentPage + 1, false)}
            >
              Próxima
            </Button>
          </div>
        ) : null}

        {loadMoreFooter}
      </section>
    </Page>
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

function isSortMode(value: string): value is SortMode {
  return SORT_OPTIONS.some((option) => option.value === value);
}

function getSortLabel(sortMode: SortMode): string {
  return SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? "Relevancia";
}

function genreLabel(genreId: number): string {
  const found = GENRE_OPTIONS.find((genre) => genre.id === genreId);
  return found?.label ?? String(genreId);
}

function buildActiveTokens(
  query: string,
  year: number | undefined,
  genreId: number | undefined,
  sortLabel: string,
): string[] {
  const tokens: string[] = [];

  if (query) {
    tokens.push(`Busca: ${query}`);
  }
  if (year) {
    tokens.push(`Ano ${year}`);
  }
  if (genreId) {
    tokens.push(`Genero ${genreLabel(genreId)}`);
  }
  if (sortLabel !== "Relevancia") {
    tokens.push(`Ordenacao ${sortLabel}`);
  }

  return tokens;
}

function compareTitles(left: MovieSummary, right: MovieSummary): number {
  return left.title.localeCompare(right.title, "pt-BR", { sensitivity: "base" });
}

function sortMovies(items: MovieSummary[], sortMode: SortMode): MovieSummary[] {
  const sorted = [...items];

  switch (sortMode) {
    case "recent":
      return sorted.sort((left, right) => {
        const rightYear = sortYearValue(right.release_date);
        const leftYear = sortYearValue(left.release_date);
        return rightYear - leftYear || compareTitles(left, right);
      });
    case "rating":
      return sorted.sort((left, right) => {
        const rightRating = typeof right.vote_average === "number" ? right.vote_average : -1;
        const leftRating = typeof left.vote_average === "number" ? left.vote_average : -1;
        return rightRating - leftRating || compareTitles(left, right);
      });
    case "title":
      return sorted.sort(compareTitles);
    case "relevance":
    default:
      return sorted;
  }
}

function sortYearValue(value?: string | null): number {
  if (!value) {
    return -1;
  }

  const year = Number(formatReleaseYear(value));
  return Number.isNaN(year) ? -1 : year;
}

function MovieGridSkeleton() {
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
