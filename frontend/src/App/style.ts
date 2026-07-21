export const APP_SHELL_ORB_CLASSES = [
  "app-shell__orb app-shell__orb--one",
  "app-shell__orb app-shell__orb--two",
] as const;

export const APP_BRAND = {
  mark: "PB",
  title: "Pixel Breeders",
  subtitle: "Filmes, notas e memória",
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
