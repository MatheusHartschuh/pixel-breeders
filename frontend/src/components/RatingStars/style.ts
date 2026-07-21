export const STAR_LABELS = [
  "Muito fraco",
  "Fraco",
  "Regular",
  "Bom",
  "Excelente",
] as const;

export const STAR_COUNT = 5;

export function getRatingStarsClassName(size: "sm" | "md" | "lg"): string {
  return `rating-stars rating-stars--${size}`;
}

export function getRatingButtonClassName(isInteractive: boolean, filled: boolean): string {
  const stateClass = isInteractive ? "rating-stars__button" : "rating-stars__button is-static";
  return `${stateClass} ${filled ? "is-filled" : ""}`.trim();
}
