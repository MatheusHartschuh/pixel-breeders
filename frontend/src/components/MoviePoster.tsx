import { useEffect, useState } from "react";

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createPalette(seed: string): [string, string, string] {
  const hash = hashString(seed);
  const hue = hash % 360;
  const secondHue = (hue + 42) % 360;
  const thirdHue = (hue + 180) % 360;
  return [`hsl(${hue} 80% 34%)`, `hsl(${secondHue} 85% 48%)`, `hsl(${thirdHue} 80% 20%)`];
}

function getMonogram(title: string): string {
  const words = title
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    return "PB";
  }

  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function createPlaceholder(title: string): string {
  const monogram = getMonogram(title);
  const [background, glow, accent] = createPalette(title);
  const escapedTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" role="img" aria-label="${escapedTitle}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${background}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="28%" r="70%">
          <stop offset="0%" stop-color="${glow}" stop-opacity="0.75" />
          <stop offset="100%" stop-color="${glow}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="600" height="900" fill="url(#bg)" rx="40" />
      <circle cx="470" cy="120" r="190" fill="url(#glow)" />
      <circle cx="140" cy="720" r="150" fill="rgba(255,255,255,0.1)" />
      <rect x="44" y="44" width="512" height="812" rx="28" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="4" />
      <text x="50%" y="48%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-size="112" font-family="Verdana, sans-serif" font-weight="700" letter-spacing="6">
        ${monogram}
      </text>
      <text x="50%" y="62%" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,0.86)" font-size="28" font-family="Verdana, sans-serif" letter-spacing="5">
        PIXEL BREEDERS
      </text>
      <text x="50%" y="83%" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,0.72)" font-size="24" font-family="Verdana, sans-serif" letter-spacing="2">
        POSTER INDISPONÍVEL
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
      className={`movie-poster ${className}`.trim()}
      src={imageSource}
      alt={`Pôster de ${title}`}
      loading="lazy"
      onError={() => setHasFailed(true)}
    />
  );
}
