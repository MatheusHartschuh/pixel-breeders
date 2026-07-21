import { getRatingButtonClassName, getRatingStarsClassName, STAR_COUNT, STAR_LABELS } from "./style";

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function RatingStars({ value, onChange, size = "md", label = "Avaliação" }: RatingStarsProps) {
  const interactive = typeof onChange === "function";

  return (
    <div className={getRatingStarsClassName(size)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: STAR_COUNT }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= value;

        if (interactive) {
          return (
            <button
              key={starValue}
              type="button"
              className={getRatingButtonClassName(true, filled)}
              aria-label={`${STAR_LABELS[index]} (${starValue} de 5)`}
              aria-pressed={filled}
              onClick={() => onChange(starValue)}
            >
              ★
            </button>
          );
        }

        return (
          <span key={starValue} className={getRatingButtonClassName(false, filled)}>
            ★
          </span>
        );
      })}
    </div>
  );
}
