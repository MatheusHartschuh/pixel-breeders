import { ptBR } from "../../i18n";

export const STAR_LABELS = ptBR.ratingStars.scaleLabels;

export const STAR_COUNT = 5;

export function getRatingStarsClassName(size: "sm" | "md" | "lg"): string {
  return `rating-stars rating-stars--${size}`;
}

export function getRatingButtonClassName(isInteractive: boolean, filled: boolean): string {
  const stateClass = isInteractive ? "rating-stars__button" : "rating-stars__button is-static";
  return `${stateClass} ${filled ? "is-filled" : ""}`.trim();
}
