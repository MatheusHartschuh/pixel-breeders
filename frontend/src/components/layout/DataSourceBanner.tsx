import type { DataSource } from "../../types";

interface DataSourceBannerProps {
  source: DataSource | null | undefined;
  className?: string;
}

export function DataSourceBanner({ source, className = "" }: DataSourceBannerProps) {
  if (source !== "fixture") {
    return null;
  }

  return (
    <aside className={`data-source-banner ${className}`.trim()} role="status" aria-live="polite">
      <strong>Exibindo dados de exemplo</strong>
      <p>configure <code>TMDB_API_KEY</code> para usar a API real do TMDB.</p>
    </aside>
  );
}
