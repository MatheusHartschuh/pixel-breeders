import { useEffect, useState } from "react";

import {
  MOVIE_POSTER_CLASS_NAME,
  PLACEHOLDER_HEIGHT,
  PLACEHOLDER_VIEWBOX,
  PLACEHOLDER_WIDTH,
} from "./style";
import { ptBR } from "../../i18n";

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createPalette(seed: string): [string, string] {
  const hash = hashString(seed);
  const glow = 20 + (hash % 18);
  const frame = 12 + (hash % 8);
  return [`rgba(200, 169, 106, ${glow / 100})`, `rgba(245, 243, 238, ${frame / 100})`];
}

function getMonogram(title: string): string {
  const words = title
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return "M";
  }

  return words[0][0].toUpperCase();
}

function createPlaceholder(title: string): string {
  const monogram = getMonogram(title);
  const [glow, accent] = createPalette(title);
  const escapedTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="${PLACEHOLDER_VIEWBOX}" role="img" aria-label="${escapedTitle}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#111315" />
          <stop offset="100%" stop-color="#1b1e22" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="24%" r="68%">
          <stop offset="0%" stop-color="${glow}" stop-opacity="0.85" />
          <stop offset="100%" stop-color="${glow}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${PLACEHOLDER_WIDTH}" height="${PLACEHOLDER_HEIGHT}" fill="url(#bg)" rx="40" />
      <circle cx="468" cy="108" r="188" fill="url(#glow)" />
      <rect x="42" y="42" width="516" height="816" rx="30" fill="none" stroke="rgba(245,243,238,0.12)" stroke-width="4" />
      <rect x="88" y="86" width="424" height="728" rx="20" fill="none" stroke="${accent}" stroke-width="2" />
      <text x="50%" y="47%" text-anchor="middle" dominant-baseline="middle" fill="#f5f3ee" font-size="104" font-family="Georgia, 'Times New Roman', serif" font-weight="700" letter-spacing="4">
        ${monogram}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

interface MoviePosterProps {
  title: string;
  posterUrl?: string | null;
  className?: string;
}

export function MoviePoster({ title, posterUrl, className = "" }: MoviePosterProps) {
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
  }, [posterUrl, title]);

  const imageSource = posterUrl && !hasFailed ? posterUrl : createPlaceholder(title);

  return (
    <img
      className={`${MOVIE_POSTER_CLASS_NAME} ${className}`.trim()}
      src={imageSource}
      alt={ptBR.movie.accessibility.posterAlt(title)}
      loading="lazy"
      onError={() => setHasFailed(true)}
    />
  );
}
