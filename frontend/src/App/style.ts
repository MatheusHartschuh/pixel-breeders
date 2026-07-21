export const APP_BRAND = {
  mark: "PB",
  title: "Pixel Breeders",
  subtitle: "Arquivo de cinema",
} as const;

type AppNavItem = {
  to: string;
  label: string;
  end?: boolean;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { to: "/", label: "Busca", end: true },
  { to: "/rated", label: "Avaliados" },
];
