// Matching algorithm: given two participants' preferences + a region, pick the
// single best Netflix movie for both, plus runners-up. Progressively relaxes
// filters if the combined constraints return nothing.

import {
  discoverNetflix,
  eraBounds,
  GENRE_NAME,
  MOOD_GENRES,
  posterUrl,
  type DiscoverFilters,
  type TmdbMovie,
} from "./tmdb";
import type { Era, MatchResult, MovieResult, Preferences } from "./types";

const MIN_VOTES = 100;

// Genres a user effectively "wants" = explicit picks + their mood's genres.
function wantedGenres(p: Preferences): Set<number> {
  return new Set<number>([...p.genres, ...MOOD_GENRES[p.mood]]);
}

// Combine two eras: same -> that era; one "any" -> the other; differ -> "any".
function combineEra(a: Era, b: Era): { era: Era; conflict: boolean } {
  if (a === b) return { era: a, conflict: false };
  if (a === "any") return { era: b, conflict: false };
  if (b === "any") return { era: a, conflict: false };
  return { era: "any", conflict: true };
}

function toResult(m: TmdbMovie, why: string): MovieResult {
  return {
    id: m.id,
    title: m.title,
    year: m.release_date ? m.release_date.slice(0, 4) : "—",
    overview: m.overview,
    posterUrl: posterUrl(m.poster_path),
    rating: Math.round(m.vote_average * 10) / 10,
    runtime: null, // discover doesn't return runtime; enforced via with_runtime.lte
    genreIds: m.genre_ids ?? [],
    why,
  };
}

interface Scored {
  movie: TmdbMovie;
  score: number;
  bothGenres: number[]; // genre ids both users wanted that the movie has
}

function scoreMovies(
  movies: TmdbMovie[],
  a: Preferences,
  b: Preferences
): Scored[] {
  const wantA = wantedGenres(a);
  const wantB = wantedGenres(b);
  // Highest vote_count in the pool, for normalizing the "trust" weight.
  const maxVotes = Math.max(1, ...movies.map((m) => m.vote_count || 0));

  return movies
    .map((m) => {
      const ids = m.genre_ids ?? [];
      let score = 0;
      const both: number[] = [];

      for (const id of ids) {
        const inA = wantA.has(id);
        const inB = wantB.has(id);
        if (inA) score += 1;
        if (inB) score += 1;
        if (inA && inB) {
          score += 3; // strong bonus: satisfies BOTH users
          both.push(id);
        }
      }

      // Quality: rating scaled, dampened by how many votes back it up.
      const trust = Math.log10(1 + (m.vote_count || 0)) / Math.log10(1 + maxVotes);
      score += (m.vote_average || 0) * 0.4 * (0.5 + 0.5 * trust);

      return { movie: m, score, bothGenres: both };
    })
    .sort((x, y) => y.score - x.score);
}

function buildWhy(s: Scored, region: string): string {
  const parts: string[] = [];
  if (s.bothGenres.length > 0) {
    const names = s.bothGenres.map((id) => GENRE_NAME[id]).filter(Boolean);
    parts.push(`${names.join(" & ")} you both picked`);
  }
  if (s.movie.vote_average) parts.push(`${s.movie.vote_average.toFixed(1)}★`);
  parts.push(`on Netflix ${region}`);
  return parts.join(" · ");
}

// Ordered attempts: start strict, relax one constraint at a time.
function buildAttempts(
  a: Preferences,
  b: Preferences,
  region: string
): { filters: DiscoverFilters; relaxedNote?: string }[] {
  const unionGenres = Array.from(
    new Set<number>([...wantedGenres(a), ...wantedGenres(b)])
  );
  const minRating = Math.max(a.minRating, b.minRating);
  const maxRuntime = Math.min(a.maxRuntime, b.maxRuntime);
  const { era, conflict: eraConflict } = combineEra(a.era, b.era);

  const base: DiscoverFilters = {
    region,
    genres: unionGenres.length ? unionGenres : undefined,
    minRating,
    minVotes: MIN_VOTES,
    maxRuntime,
    era,
  };

  const attempts: { filters: DiscoverFilters; relaxedNote?: string }[] = [
    { filters: base, relaxedNote: eraConflict ? "different eras → any era" : undefined },
  ];

  // 1) drop runtime cap
  if (maxRuntime < 240) {
    attempts.push({
      filters: { ...base, maxRuntime: 240 },
      relaxedNote: "runtime limit removed",
    });
  }
  // 2) widen era
  if (era !== "any") {
    attempts.push({
      filters: { ...base, maxRuntime: 240, era: "any" },
      relaxedNote: "era widened to any",
    });
  }
  // 3) lower the rating bar
  if (minRating > 5) {
    attempts.push({
      filters: { ...base, maxRuntime: 240, era: "any", minRating: 5 },
      relaxedNote: "minimum rating lowered to 5.0",
    });
  }
  // 4) drop genres entirely — just good Netflix movies in region
  attempts.push({
    filters: {
      region,
      minRating: 5,
      minVotes: MIN_VOTES,
      maxRuntime: 240,
      era: "any",
    },
    relaxedNote: "genres relaxed — top Netflix picks for your region",
  });

  return attempts;
}

export async function runMatch(
  a: Preferences,
  b: Preferences,
  region: string
): Promise<MatchResult> {
  const attempts = buildAttempts(a, b, region);
  const relaxed: string[] = [];

  for (const attempt of attempts) {
    // Pull two pages for a deeper candidate pool.
    const [p1, p2] = await Promise.all([
      discoverNetflix({ ...attempt.filters, page: 1 }),
      discoverNetflix({ ...attempt.filters, page: 2 }),
    ]);
    const pool = [...p1, ...p2];

    if (pool.length === 0) {
      if (attempt.relaxedNote) relaxed.push(attempt.relaxedNote);
      continue;
    }

    const scored = scoreMovies(pool, a, b);
    const pick = scored[0];
    const runnersUp = scored.slice(1, 4);

    if (attempt.relaxedNote) relaxed.push(attempt.relaxedNote);

    return {
      pick: toResult(pick.movie, buildWhy(pick, region)),
      runnersUp: runnersUp.map((s) => toResult(s.movie, buildWhy(s, region))),
      relaxed,
      region,
      generatedAt: new Date().toISOString(),
    };
  }

  throw new Error(
    "No Netflix titles found for this region even after relaxing all filters."
  );
}
