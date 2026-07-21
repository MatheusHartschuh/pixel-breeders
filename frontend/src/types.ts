export interface MovieSummary {
  id: number;
  title: string;
  overview?: string | null;
  release_date?: string | null;
  poster_url?: string | null;
  user_rating?: number | null;
  vote_average?: number | null;
  genre_ids?: number[];
}

export interface CastMember {
  name: string;
  character?: string | null;
  profile_url?: string | null;
}

export interface MovieDetail extends MovieSummary {
  cast: CastMember[];
}

export interface SearchResponse {
  items: MovieSummary[];
  page: number;
  total_pages: number;
  total_results: number;
}

export interface RatingRecord {
  id: number;
  tmdb_id: number;
  title: string;
  poster_url?: string | null;
  overview?: string | null;
  release_date?: string | null;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface RatingInput {
  tmdb_id: number;
  title: string;
  poster_url?: string | null;
  overview?: string | null;
  release_date?: string | null;
  rating: number;
}
