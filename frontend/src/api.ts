import type {
  AuthCredentials,
  AuthResponse,
  AuthUser,
  MovieDetail,
  RatingInput,
  RatingRecord,
  SearchResponse,
} from "./types";
import { readAuthToken } from "./auth/storage";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

async function readError(response: Response): Promise<string> {
  function extractMessage(value: unknown): string | null {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (Array.isArray(value)) {
      const messages = value
        .map((item) => extractMessage(item))
        .filter((message): message is string => Boolean(message));
      return messages.length > 0 ? messages.join(", ") : null;
    }

    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.msg === "string") {
        return record.msg;
      }
      if (typeof record.message === "string") {
        return record.message;
      }
      if ("detail" in record) {
        return extractMessage(record.detail);
      }
      return null;
    }

    return null;
  }

  try {
    const data = (await response.json()) as { detail?: unknown; message?: unknown };
    return extractMessage(data.detail) ?? extractMessage(data.message) ?? response.statusText;
  } catch {
    return response.statusText || "Ocorreu um erro inesperado";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readAuthToken();
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function searchMovies(
  query: string,
  page = 1,
  signal?: AbortSignal,
  filters?: { year?: number; genreId?: number },
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    query,
    page: String(page),
  });

  if (typeof filters?.year === "number") {
    params.set("year", String(filters.year));
  }

  if (typeof filters?.genreId === "number") {
    params.set("genre_id", String(filters.genreId));
  }

  return request<SearchResponse>(`/search?${params.toString()}`, { signal });
}

export function getMovie(movieId: number): Promise<MovieDetail> {
  return request<MovieDetail>(`/movies/${movieId}`);
}

export function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/auth/me");
}

export function login(payload: AuthCredentials): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: AuthCredentials): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listRatings(): Promise<RatingRecord[]> {
  return request<RatingRecord[]>("/ratings");
}

export function createRating(payload: RatingInput): Promise<RatingRecord> {
  return request<RatingRecord>("/ratings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRating(movieId: number, rating: number): Promise<RatingRecord> {
  return request<RatingRecord>(`/ratings/${movieId}`, {
    method: "PATCH",
    body: JSON.stringify({ rating }),
  });
}

export function deleteRating(movieId: number): Promise<void> {
  return request<void>(`/ratings/${movieId}`, {
    method: "DELETE",
  });
}
