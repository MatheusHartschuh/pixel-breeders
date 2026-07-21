export function formatReleaseDate(value?: string | null): string {
  if (!value) {
    return "Data indisponível";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatReleaseYear(value?: string | null): string {
  if (!value) {
    return "Ano indisponível";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return String(date.getFullYear());
}

export function formatRating(value?: number | null): string {
  if (typeof value !== "number") {
    return "Sem nota";
  }

  return `${value}/5`;
}

export function formatVoteAverage(value?: number | null): string {
  if (typeof value !== "number") {
    return "--";
  }

  return value.toFixed(1);
}

export function formatEvaluationDate(value?: string | null): string {
  if (!value) {
    return "Data indisponivel";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
