export function getSafeRedirectPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(next);
    if (decoded.startsWith("/") && decoded !== "/login" && decoded !== "/register") {
      return decoded;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function buildAuthNextPath(pathname: string, search: string): string {
  if (pathname === "/login" || pathname === "/register") {
    return "/";
  }

  return `${pathname}${search}`;
}
