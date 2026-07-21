import type { DataSource } from "../../types";
import { ptBR } from "../../i18n";

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
      <strong>{ptBR.banner.fixtureTitle}</strong>
      <p>{ptBR.banner.fixtureDescription}</p>
    </aside>
  );
}
