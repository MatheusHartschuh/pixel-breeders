import { EmptyState } from "../layout/EmptyState";
import { Page } from "../layout/Page";

interface AuthLoadingStateProps {
  title: string;
  description: string;
}

export function AuthLoadingState({ title, description }: AuthLoadingStateProps) {
  return (
    <Page>
      <EmptyState title={title} description={description} titleAs="h1" size="large" />
    </Page>
  );
}
