import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { searchMovies } from "../api";
import { MovieCard } from "../components/MovieCard";
import type { MovieSummary } from "../types";

const FEATURED_QUERIES = ["The Matrix", "Interstellar", "Parasite", "Whiplash"];

type SearchStatus = "idle" | "typing" | "loading" | "success" | "empty" | "error";
type SearchMode = "pagination" | "infinite";

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [draft, setDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>("pagination");
  const [items, setItems] = useState<MovieSummary[]>([]);
  const [status, setStatus] = useState<SearchStatus>(initialQuery ? "loading" : "idle");
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
    const trimmedQuery = targetQuery.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
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
      const response = await searchMovies(trimmedQuery, page, controller.signal);

      if (controller.signal.aborted) {
        return;
      }

      setResultCount(response.total_results);
      setCurrentPage(response.page);
      setTotalPages(response.total_pages);
      setItems((current) => {
        if (append) {
          return [...current, ...response.items];
        }

        return response.items;
      });

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
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      resetResults("idle");
      setSearchParams({}, { replace: true });
      return;
    }

    if (trimmedQuery.length < 2) {
      resetResults("typing");
      setSearchParams({ q: trimmedQuery }, { replace: true });
      return;
    }

    setSearchParams({ q: trimmedQuery }, { replace: true });

    void loadPage(trimmedQuery, 1, false);
  }, [mode, query, setSearchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft.trim());
  }

  function handleSuggestion(value: string) {
    setDraft(value);
    setQuery(value);
  }

  function handleLoadMore() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2 || status !== "success") {
      return;
    }

    if (isLoadingMore || currentPage >= totalPages) {
      return;
    }

    void loadPage(trimmedQuery, currentPage + 1, true);
  }

  const hasSearch = query.trim().length >= 2;
  const hasMorePages = hasSearch && totalPages > 0 && currentPage < totalPages;

  // Monta os atalhos de busca sugeridos para iniciar rapidamente uma pesquisa.
  const featuredQueryChips = FEATURED_QUERIES.map((queryName) => (
    <button key={queryName} type="button" className="chip" onClick={() => handleSuggestion(queryName)}>
      {queryName}
    </button>
  ));

  // Renderiza o bloco superior com texto de apresentação, busca e atalhos.
  const heroSection = (
    <section className="hero">
      <div className="hero__content">
        <span className="eyebrow">MVP sem login</span>
        <h1>Busque, avalie e volte depois para revisar seus filmes favoritos.</h1>
        <p>
          Um fluxo simples e direto: pesquisa via TMDB, detalhes do filme, nota de 1 a 5 e uma lista centralizada
          dos filmes já avaliados.
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

        <div className="search-box__chips">{featuredQueryChips}</div>

        <div className="hero__links">
          <Link className="button button--secondary" to="/rated">
            Ver filmes avaliados
          </Link>
          <span className="hero__hint">Sem login, sem fricção, com persistência no banco.</span>
        </div>
      </div>
    </section>
  );

  // Agrupa o controle de modo e a ação de limpar a busca em um único bloco.
  const resultsToolbar = (
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
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setDraft("");
            setQuery("");
          }}
        >
          Limpar busca
        </button>
      ) : null}
    </div>
  );

  // Exibe o resumo da consulta atual quando existe uma busca ativa.
  const resultsSummary = hasSearch ? (
    <div className="results-summary">
      <span>
        Página {currentPage || 1}
        {totalPages > 0 ? ` de ${totalPages}` : ""}
      </span>
      <span>{mode === "pagination" ? "Modo paginado" : "Modo scroll infinito"}</span>
    </div>
  ) : null;

  // Seleciona o estado da lista de resultados antes de renderizar a grade.
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
          description="Use os atalhos acima ou procure diretamente por qualquer filme do TMDB."
        />
      );
    }

    if (status === "empty") {
      return (
        <StateMessage
          title="Nenhum filme encontrado"
          description="Tente outro título ou explore uma das sugestões acima."
        />
      );
    }

    return null;
  })();

  // Renderiza a grade principal com os filmes encontrados na busca.
  const resultsGrid = status === "success" && items.length > 0 ? (
    <div className="movie-grid">
      {items.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  ) : null;

  // Mostra o aviso quando a primeira página carregou, mas a próxima falhou.
  const paginationErrorNotice = status === "success" && error && items.length > 0 ? (
    <div className="inline-notice inline-notice--error">
      <strong>Não foi possível carregar a próxima página.</strong>
      <span>{error}</span>
    </div>
  ) : null;

  // Exibe os controles de paginação para o modo tradicional.
  const paginationBar =
    mode === "pagination" && status === "success" && items.length > 0 && totalPages > 1 ? (
      <div className="pagination-bar">
        <button
          className="button button--secondary"
          type="button"
          disabled={currentPage <= 1 || isLoadingMore}
          onClick={() => void loadPage(query, currentPage - 1, false)}
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
          onClick={() => void loadPage(query, currentPage + 1, false)}
        >
          Próxima
        </button>
      </div>
    ) : null;

  // Exibe o rodapé do modo infinito com o sentinela e o carregamento adicional.
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
      {
        rootMargin: "240px",
      },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [currentPage, hasMorePages, isLoadingMore, mode, status]);

  return (
    <div className="page">
      {heroSection}

      <section className="results-section">
        <div className="section-heading">
          <div>
            <span className="section-heading__eyebrow">Resultados</span>
            <h2>{hasSearch ? `Encontramos ${resultCount} filmes` : "Digite algo para começar"}</h2>
          </div>

          {resultsToolbar}
        </div>

        {resultsSummary}
        {resultsState}
        {resultsGrid}
        {paginationErrorNotice}
        {paginationBar}
        {infiniteFooter}
      </section>
    </div>
  );
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
