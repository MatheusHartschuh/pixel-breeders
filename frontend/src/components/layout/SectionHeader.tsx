import type { ReactNode } from "react";

type HeadingTag = "h1" | "h2" | "h3";

interface SectionHeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  titleAs?: HeadingTag;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({ eyebrow, title, titleAs = "h2", actions, className = "" }: SectionHeaderProps) {
  const TitleTag = titleAs;

  return (
    <div className={`section-heading ${className}`.trim()}>
      <div>
        <span className="section-heading__eyebrow">{eyebrow}</span>
        <TitleTag>{title}</TitleTag>
      </div>

      {actions}
    </div>
  );
}
