import type { MovieDetail, RatingInput, RatingRecord, SearchResponse } from "./types";

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { detail?: string; message?: string };
    return data.detail ?? data.message ?? response.statusText;
  } catch {
    return response.statusText || "Ocorreu um erro inesperado";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function searchMovies(query: string, page = 1, signal?: AbortSignal): Promise<SearchResponse> {
  const params = new URLSearchParams({
    query,
    page: String(page),
  });

  return request<SearchResponse>(`/search?${params.toString()}`, { signal });
}

export function getMovie(movieId: number): Promise<MovieDetail> {
  return request<MovieDetail>(`/movies/${movieId}`);
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
