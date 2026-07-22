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
import { GenreSelect } from "../components/ui/GenreSelect";
import { PaginationControls } from "../components/ui/PaginationControls";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { ptBR } from "../i18n";
import type { DataSource, MovieSummary } from "../types";

const HOME = ptBR.home;
const SORT_OPTIONS = HOME.sortOptions;
const GENRE_OPTIONS = HOME.genreOptions;
const RESULT_MODE_OPTIONS = [
  { value: "pagination", label: HOME.mode.pagination },
  { value: "infinite", label: HOME.mode.infinite },
] as const;
const DEFAULT_SORT_MODE = SORT_OPTIONS[0].value;

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
  const initialSort = searchParams.get("sort") ?? DEFAULT_SORT_MODE;
  const initialSortMode = isSortMode(initialSort) ? initialSort : DEFAULT_SORT_MODE;
  const initialStatus =
    initialQuery.length > 0 && initialQuery.length < 2 && !initialYear && !initialGenre
      ? "typing"
      : "loading";

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
    document.title = HOME.documentTitle;
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
  const visibleItems = items;
  const sortLabel = getSortLabel(sortMode);
  const activeTokens = buildActiveTokens(trimmedQuery, normalizedYear, selectedGenreId, sortLabel);
  const isInitialDiscovery = !hasSearch && sortMode === DEFAULT_SORT_MODE;

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
        sort: sortMode,
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

      const message = requestError instanceof Error ? requestError.message : ptBR.common.feedback.genericSearchError;
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
  }, [trimmedQuery, normalizedYear, selectedGenreId, yearIsPending, hasActiveFilters, sortMode]);

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
    if (sortMode !== DEFAULT_SORT_MODE) {
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
  }, [mode, hasMorePages, isLoadingMore, status, currentPage, totalPages, trimmedQuery, selectedGenreId, normalizedYear, sortMode]);

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

  function handleJumpToPage(page: number) {
    if (page === currentPage) {
      return;
    }

    void loadPage(trimmedQuery, page, false);
  }

  function handleClearAll() {
    setDraft("");
    setQuery("");
    setYearInput("");
    setGenreId("");
    setSortMode(DEFAULT_SORT_MODE);
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
      return <EmptyState title={HOME.states.failureTitle} description={error} titleAs="h3" />;
    }

    if (status === "typing") {
      return (
        <EmptyState
          title={HOME.states.continueTypingTitle}
          description={HOME.states.continueTypingDescription}
          titleAs="h3"
        />
      );
    }

    if (status === "empty") {
      return <EmptyState title={HOME.states.emptyTitle} description={HOME.states.emptyDescription} titleAs="h3" />;
    }

    return null;
  })();

  const loadMoreFooter =
    mode === "infinite" && status === "success" && visibleItems.length > 0 ? (
      <div className="infinite-footer">
        <div ref={sentinelRef} className="infinite-footer__sentinel" aria-hidden="true" />
        {hasMorePages ? (
          <Button variant="secondary" type="button" onClick={handleLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? ptBR.common.buttons.loading : ptBR.common.buttons.loadMore}
          </Button>
        ) : (
          <p className="infinite-footer__end">{HOME.footer.infiniteEnd}</p>
        )}
      </div>
    ) : null;

  // Intro editorial que apresenta o fluxo de busca.
  const searchIntroSection = (
    <section className="search-intro">
      <span className="eyebrow">{HOME.intro.eyebrow}</span>
      <h1>{HOME.intro.title}</h1>
      <p>{HOME.intro.description}</p>
    </section>
  );

  // Console principal com campo de busca, filtros e ação de limpar.
  const searchConsoleSection = (
    <section className="search-console" aria-label={HOME.searchConsoleLabel}>
      <form className="search-bar" onSubmit={handleSubmit}>
        <label className="search-bar__label" htmlFor="movie-search">
          {HOME.searchBar.label}
        </label>
        <div className="search-bar__row">
          <span className="search-bar__icon" aria-hidden="true" />
          <input
            id="movie-search"
            className="search-bar__input"
            type="search"
            placeholder={HOME.searchBar.placeholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="off"
          />
          <Button variant="primary" type="submit">
            {HOME.searchBar.submit}
          </Button>
        </div>
      </form>

      <div className="search-tools">
        <Field variant="filter" label={HOME.filters.year}>
          <input
            className="search-filters__input"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder={HOME.filters.yearPlaceholder}
            value={yearInput}
            onChange={(event) => handleYearChange(event.target.value)}
          />
        </Field>

        <Field variant="filter" label={HOME.filters.genre}>
          <GenreSelect
            value={genreId}
            allLabel={HOME.filters.allGenres}
            ariaLabel={HOME.filters.genre}
            options={GENRE_OPTIONS}
            onChange={setGenreId}
          />
        </Field>

        <div className="search-tools__sort">
          <span className="search-tools__label">{HOME.filters.order}</span>
          <SegmentedControl<SortMode>
            ariaLabel={HOME.filters.order}
            value={sortMode}
            onChange={setSortMode}
            options={SORT_OPTIONS}
          />
        </div>
      </div>

      <div className="search-tools__footer">
        {hasSearch || resultCount > 0 ? (
          <Button variant="danger" type="button" onClick={handleClearAll}>
            {ptBR.common.buttons.clearFilters}
          </Button>
        ) : null}
      </div>
    </section>
  );

  // Resultados, resumo e paginação do catálogo filtrado.
  const resultsSection = (
    <section className="results-section">
      <DataSourceBanner source={dataSource} />
      <SectionHeader
        className="home-results-heading"
        eyebrow={isInitialDiscovery ? HOME.section.initialEyebrow : HOME.section.resultsEyebrow}
        title={
          status === "loading"
            ? isInitialDiscovery
              ? HOME.section.loadingDiscovery
              : HOME.section.loadingSearch
            : isInitialDiscovery
              ? (
                  <>
                    <span className="home-results-heading__count">{resultCount}</span>{" "}
                    <span className="home-results-heading__suffix">{HOME.section.featuredCountSuffix}</span>
                  </>
                )
              : (
                  <>
                    <span className="home-results-heading__count">{resultCount}</span>{" "}
                    <span className="home-results-heading__suffix">{HOME.section.foundCountSuffix}</span>
                  </>
                )
        }
        titleAs="h2"
        actions={
          <SegmentedControl<SearchMode>
            ariaLabel={HOME.mode.label}
            value={mode}
            onChange={setMode}
            options={RESULT_MODE_OPTIONS}
          />
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
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          isLoading={isLoadingMore}
          onPrevious={() => void loadPage(trimmedQuery, currentPage - 1, false)}
          onNext={() => void loadPage(trimmedQuery, currentPage + 1, false)}
          onJumpToPage={handleJumpToPage}
        />
      ) : null}

      {loadMoreFooter}
    </section>
  );

  return (
    <Page className="home-page">
      {searchIntroSection}
      {searchConsoleSection}
      {resultsSection}
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
  return SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? SORT_OPTIONS[0].label;
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
    tokens.push(`${HOME.summary.searchPrefix} ${query}`);
  }
  if (year) {
    tokens.push(`${HOME.summary.yearPrefix} ${year}`);
  }
  if (genreId) {
    tokens.push(`${HOME.summary.genrePrefix} ${genreLabel(genreId)}`);
  }
  if (sortLabel !== SORT_OPTIONS[0].label) {
    tokens.push(`${HOME.summary.orderPrefix} ${sortLabel}`);
  }

  return tokens;
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
