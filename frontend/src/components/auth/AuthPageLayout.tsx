import type { ReactNode } from "react";

import { Page } from "../layout/Page";
import { Panel } from "../layout/Panel";

interface AuthPageLayoutProps {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  introActions: ReactNode;
  cardTitle: ReactNode;
  cardDescription: ReactNode;
  children: ReactNode;
}

export function AuthPageLayout({
  eyebrow,
  title,
  description,
  introActions,
  cardTitle,
  cardDescription,
  children,
}: AuthPageLayoutProps) {
  return (
    <Page>
      <section className="auth-page">
        <div className="auth-page__intro">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="auth-page__links">{introActions}</div>
        </div>

        <Panel className="auth-card" title={cardTitle} description={cardDescription}>
          {children}
        </Panel>
      </section>
    </Page>
  );
}
