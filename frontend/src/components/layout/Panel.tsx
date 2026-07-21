import type { ReactNode } from "react";

interface PanelProps {
  title?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Panel({ title, description, aside, children, className = "" }: PanelProps) {
  const hasHeader = title != null || description != null || aside != null;

  return (
    <div className={`panel ${className}`.trim()}>
      {hasHeader ? (
        <div className="panel__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {aside}
        </div>
      ) : null}
      {children}
    </div>
  );
}
