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

export function formatRating(value?: number | null): string {
  if (typeof value !== "number") {
    return "Sem nota";
  }

  return `${value}/5`;
}
