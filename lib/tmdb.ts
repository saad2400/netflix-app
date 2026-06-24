// TMDB helpers. Server-only (uses TMDB_API_KEY). Filters to Netflix via the
// watch-provider discover params: with_watch_providers=8 + watch_region=<cc>.

import type { Era, Mood } from "./types";

const TMDB_BASE = "https://api.themoviedb.org/3";
const NETFLIX_PROVIDER_ID = 8;
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

// Supported Netflix regions shown in the UI dropdown.
export const REGIONS: { code: string; name: string }[] = [
  { code: "PK", name: "Pakistan" },
  { code: "AU", name: "Australia" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "IN", name: "India" },
];

// TMDB movie genres (stable ids).
export const GENRES: { id: number; name: string }[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Sci-Fi" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
];

export const GENRE_NAME: Record<number, string> = Object.fromEntries(
  GENRES.map((g) => [g.id, g.name])
);

// Mood/vibe -> genre ids the mood biases toward.
export const MOOD_GENRES: Record<Mood, number[]> = {
  any: [],
  lighthearted: [35, 10751, 16], // Comedy, Family, Animation
  intense: [53, 28, 80], // Thriller, Action, Crime
  thoughtful: [18, 9648, 878], // Drama, Mystery, Sci-Fi
  scary: [27, 53], // Horror, Thriller
  romantic: [10749, 35], // Romance, Comedy
};

// Era -> primary_release_date bounds.
export function eraBounds(era: Era): { gte?: string; lte?: string } {
  switch (era) {
    case "2020s":
      return { gte: "2020-01-01" };
    case "2010s":
      return { gte: "2010-01-01", lte: "2019-12-31" };
    case "2000s":
      return { gte: "2000-01-01", lte: "2009-12-31" };
    case "90s":
      return { gte: "1990-01-01", lte: "1999-12-31" };
    case "classic":
      return { lte: "1989-12-31" };
    default:
      return {};
  }
}

export function posterUrl(path: string | null): string | null {
  return path ? `${IMAGE_BASE}${path}` : null;
}

// Build auth: support both v4 read token (Bearer) and v3 api_key.
function authHeaders(): HeadersInit {
  const key = process.env.TMDB_API_KEY ?? "";
  // v4 read access tokens are JWTs (contain two dots). Use Bearer for those.
  if (key.split(".").length === 3) {
    return { Authorization: `Bearer ${key}`, accept: "application/json" };
  }
  return { accept: "application/json" };
}

function withApiKey(params: URLSearchParams): URLSearchParams {
  const key = process.env.TMDB_API_KEY ?? "";
  if (key.split(".").length !== 3) {
    params.set("api_key", key);
  }
  return params;
}

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date: string;
  genre_ids: number[];
}

export interface DiscoverFilters {
  region: string;
  genres?: number[]; // OR-combined
  minRating?: number;
  minVotes?: number;
  maxRuntime?: number; // minutes; omit/240 = no cap
  era?: Era;
  page?: number;
}

export async function discoverNetflix(
  filters: DiscoverFilters
): Promise<TmdbMovie[]> {
  if (!process.env.TMDB_API_KEY) {
    throw new Error("TMDB_API_KEY is not set");
  }

  const params = new URLSearchParams({
    include_adult: "false",
    language: "en-US",
    sort_by: "popularity.desc",
    watch_region: filters.region,
    with_watch_providers: String(NETFLIX_PROVIDER_ID),
    with_watch_monetization_types: "flatrate",
    page: String(filters.page ?? 1),
  });

  if (filters.genres && filters.genres.length > 0) {
    params.set("with_genres", filters.genres.join("|")); // OR
  }
  if (typeof filters.minRating === "number" && filters.minRating > 0) {
    params.set("vote_average.gte", String(filters.minRating));
  }
  if (typeof filters.minVotes === "number") {
    params.set("vote_count.gte", String(filters.minVotes));
  }
  if (filters.maxRuntime && filters.maxRuntime < 240) {
    params.set("with_runtime.lte", String(filters.maxRuntime));
  }
  if (filters.era) {
    const { gte, lte } = eraBounds(filters.era);
    if (gte) params.set("primary_release_date.gte", gte);
    if (lte) params.set("primary_release_date.lte", lte);
  }

  withApiKey(params);

  const res = await fetch(`${TMDB_BASE}/discover/movie?${params.toString()}`, {
    headers: authHeaders(),
    // TMDB data is fine to cache briefly; keeps repeated matches snappy.
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB discover failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { results: TmdbMovie[] };
  return data.results ?? [];
}
