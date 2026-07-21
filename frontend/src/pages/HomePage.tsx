import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { searchMovies } from "../api";
import { MovieCard } from "../components/MovieCard";
import type { MovieSummary } from "../types";

const FEATURED_QUERIES = ["The Matrix", "Interstellar", "Parasite", "Whiplash"];

type SearchStatus = "idle" | "typing" | "loading" | "success" | "empty" | "error";

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [draft, setDraft] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<MovieSummary[]>([]);
  const [status, setStatus] = useState<SearchStatus>(initialQuery ? "loading" : "idle");
  const [error, setError] = useState("");
  const [resultCount, setResultCount] = useState(0);

  useEffect(() => {
    document.title = "Pixel Breeders | Busca de filmes";
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQuery(draft.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [draft]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setItems([]);
      setStatus("idle");
      setError("");
      setResultCount(0);
      setSearchParams({}, { replace: true });
      return;
    }

    if (trimmedQuery.length < 2) {
      setItems([]);
      setStatus("typing");
      setError("");
      setResultCount(0);
      setSearchParams({ q: trimmedQuery }, { replace: true });
      return;
    }

    const controller = new AbortController();
    setStatus("loading");
    setError("");
    setSearchParams({ q: trimmedQuery }, { replace: true });

    searchMovies(trimmedQuery)
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setItems(response.items);
        setResultCount(response.total_results);
        setStatus(response.items.length > 0 ? "success" : "empty");
      })
      .catch((requestError) => {
        if (controller.signal.aborted) {
          return;
        }

        setItems([]);
        setResultCount(0);
        setError(requestError instanceof Error ? requestError.message : "Falha ao buscar filmes");
        setStatus("error");
      });

    return () => controller.abort();
  }, [query, setSearchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draft.trim());
  }

  function handleSuggestion(value: string) {
    setDraft(value);
    setQuery(value);
  }

  const hasSearch = query.trim().length >= 2;

  return (
    <div className="page">
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

          <div className="search-box__chips">
            {FEATURED_QUERIES.map((queryName) => (
              <button key={queryName} type="button" className="chip" onClick={() => handleSuggestion(queryName)}>
                {queryName}
              </button>
            ))}
          </div>

          <div className="hero__links">
            <Link className="button button--secondary" to="/rated">
              Ver filmes avaliados
            </Link>
            <span className="hero__hint">Sem login, sem fricção, com persistência no banco.</span>
          </div>
        </div>
      </section>

      <section className="results-section">
        <div className="section-heading">
          <div>
            <span className="section-heading__eyebrow">Resultados</span>
            <h2>{hasSearch ? `Encontramos ${resultCount} filmes` : "Digite algo para começar"}</h2>
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

        {status === "loading" ? <MovieGridSkeleton /> : null}

        {status === "error" ? <StateMessage title="Falha na busca" description={error} /> : null}

        {status === "typing" ? (
          <StateMessage
            title="Continue digitando"
            description="A busca começa com pelo menos 2 caracteres para evitar chamadas desnecessárias."
          />
        ) : null}

        {status === "idle" ? (
          <StateMessage
            title="Experimente uma busca"
            description="Use os atalhos acima ou procure diretamente por qualquer filme do TMDB."
          />
        ) : null}

        {status === "empty" ? (
          <StateMessage
            title="Nenhum filme encontrado"
            description="Tente outro título ou explore uma das sugestões acima."
          />
        ) : null}

        {status === "success" ? (
          <div className="movie-grid">
            {items.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : null}
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
