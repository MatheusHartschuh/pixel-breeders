export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "text" | "chip" | "segmented";

export function getButtonClassName(variant: ButtonVariant, active: boolean, className: string): string {
  const baseClassName =
    variant === "text"
      ? "text-button"
      : variant === "chip"
        ? "chip"
        : variant === "segmented"
          ? `segmented-control__button ${active ? "is-active" : ""}`
          : `button button--${variant}`;

  return `${baseClassName} ${className}`.trim();
}
