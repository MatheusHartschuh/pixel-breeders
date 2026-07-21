interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const STAR_LABELS = [
  "Muito fraco",
  "Fraco",
  "Regular",
  "Bom",
  "Excelente",
];

export function RatingStars({ value, onChange, size = "md", label = "Avaliação" }: RatingStarsProps) {
  const interactive = typeof onChange === "function";

  return (
    <div className={`rating-stars rating-stars--${size}`}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= value;

        if (interactive) {
          return (
            <button
              key={starValue}
              type="button"
              className={`rating-stars__button ${filled ? "is-filled" : ""}`}
              aria-label={`${STAR_LABELS[index]} (${starValue} de 5)`}
              aria-pressed={filled}
              onClick={() => onChange(starValue)}
            >
              ★
            </button>
          );
        }

        return (
          <span key={starValue} className={`rating-stars__button is-static ${filled ? "is-filled" : ""}`}>
            ★
          </span>
        );
      })}
    </div>
  );
}
