// Shared types used across client, server, and the matching algorithm.

export type SessionStatus = "waiting" | "ready" | "matched";

export type Mood =
  | "any"
  | "lighthearted"
  | "intense"
  | "thoughtful"
  | "scary"
  | "romantic";

export type Era = "any" | "2020s" | "2010s" | "2000s" | "90s" | "classic";

export interface Preferences {
  genres: number[]; // TMDB genre ids
  mood: Mood;
  era: Era;
  minRating: number; // 0 - 10
  maxRuntime: number; // minutes; 240 = no limit
}

export interface Participant {
  id: string;
  session_id: string;
  client_id: string;
  label: string; // "User 1" / "User 2"
  prefs: Preferences | null;
  submitted: boolean;
  created_at: string;
}

export interface MovieResult {
  id: number;
  title: string;
  year: string;
  overview: string;
  posterUrl: string | null;
  rating: number;
  runtime: number | null; // minutes (may be null from discover)
  genreIds: number[];
  why: string;
}

export interface MatchResult {
  pick: MovieResult;
  runnersUp: MovieResult[];
  relaxed: string[]; // human-readable list of filters that had to be relaxed
  region: string;
  generatedAt: string;
}

export interface SessionRow {
  id: string;
  code: string;
  region: string;
  status: SessionStatus;
  result: MatchResult | null;
  created_at: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
  genres: [],
  mood: "any",
  era: "any",
  minRating: 6,
  maxRuntime: 240,
};
