import type { AuthUser } from "../types";

const AUTH_STORAGE_KEY = "pixel_breeders_auth";

export interface AuthSession {
  token: string;
  user: AuthUser;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readAuthSession(): AuthSession | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (typeof parsed.token !== "string" || !parsed.user || typeof parsed.user.id !== "number") {
      return null;
    }

    return {
      token: parsed.token,
      user: parsed.user,
    };
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function readAuthToken(): string | null {
  return readAuthSession()?.token ?? null;
}
