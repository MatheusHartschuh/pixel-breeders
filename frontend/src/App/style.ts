import { ptBR } from "../i18n";

export const APP_BRAND = {
  mark: ptBR.app.brand.mark,
  title: ptBR.app.brand.title,
  subtitle: ptBR.app.brand.subtitle,
} as const;

type AppNavItem = {
  to: string;
  label: string;
  end?: boolean;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { to: "/", label: ptBR.app.nav.search, end: true },
  { to: "/rated", label: ptBR.app.nav.rated },
  { to: "/settings", label: ptBR.app.nav.settings },
];
