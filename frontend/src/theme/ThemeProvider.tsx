import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";

export type ThemeMode = "dark" | "light";

const THEME_STORAGE_KEY = "pixel_breeders_theme";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function readThemePreference(): ThemeMode {
  if (!isBrowser()) {
    return "dark";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" ? "light" : "dark";
}

function setThemeMetaColor(theme: ThemeMode): void {
  if (!isBrowser()) {
    return;
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "light" ? "#f5efe7" : "#111315");
  }
}

export function applyThemePreference(theme: ThemeMode): void {
  if (!isBrowser()) {
    return;
  }

  document.documentElement.dataset.theme = theme;
  setThemeMetaColor(theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => readThemePreference());

  useLayoutEffect(() => {
    if (!isBrowser()) {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyThemePreference(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: setThemeState,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de um ThemeProvider.");
  }

  return context;
}
