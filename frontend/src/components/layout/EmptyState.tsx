import type { ReactNode } from "react";

type HeadingTag = "h1" | "h2" | "h3";

interface EmptyStateProps {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  titleAs?: HeadingTag;
  size?: "default" | "large";
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  titleAs = "h2",
  size = "default",
  className = "",
}: EmptyStateProps) {
  const TitleTag = titleAs;

  return (
    <div className={`empty-state ${size === "large" ? "empty-state--large" : ""} ${className}`.trim()}>
      <TitleTag>{title}</TitleTag>
      <p>{description}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
