import { ptBR } from "../../i18n";

export const MOVIE_CARD_CLASSNAMES = {
  root: "movie-card",
  link: "movie-card__link",
  poster: "movie-card__poster",
  body: "movie-card__body",
  details: "movie-card__details",
  titleRow: "movie-card__title-row",
  title: "movie-card__title",
  year: "movie-card__year",
  scores: "movie-card__scores",
  metaRow: "movie-card__meta-row",
  score: "movie-card__score",
  ratingDate: "movie-card__rating-date",
  actions: "movie-card__actions",
} as const;

export const MOVIE_CARD_COPY = {
  userRatingPrefix: ptBR.cards.userRatingPrefix,
} as const;
