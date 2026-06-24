"use client";

import type { MatchResult, MovieResult } from "@/lib/types";

function Poster({ movie, size }: { movie: MovieResult; size: "lg" | "sm" }) {
  const dims = size === "lg" ? "w-40 sm:w-48" : "w-20";
  if (!movie.posterUrl) {
    return (
      <div
        className={`${dims} aspect-[2/3] shrink-0 rounded-lg bg-neutral-800 grid place-items-center text-center text-xs text-neutral-500`}
      >
        No poster
      </div>
    );
  }
  // Plain <img> keeps things simple and avoids next/image config edge cases.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={movie.posterUrl}
      alt={movie.title}
      className={`${dims} aspect-[2/3] shrink-0 rounded-lg object-cover`}
    />
  );
}

export default function ResultCard({
  result,
  onTryAgain,
  retrying,
}: {
  result: MatchResult;
  onTryAgain: () => void;
  retrying: boolean;
}) {
  const { pick, runnersUp, relaxed } = result;

  return (
    <div className="rounded-2xl border border-neutral-800 bg-netflix-gray/50 p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-netflix-red">
        Your match
      </p>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row">
        <Poster movie={pick} size="lg" />
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold">
            {pick.title}{" "}
            <span className="font-normal text-neutral-400">({pick.year})</span>
          </h2>
          <p className="mt-1 text-sm text-neutral-300">{pick.why}</p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-300 line-clamp-6">
            {pick.overview || "No synopsis available."}
          </p>
        </div>
      </div>

      {relaxed.length > 0 && (
        <p className="mt-4 rounded-lg bg-amber-950/40 px-3 py-2 text-xs text-amber-300">
          Your combined picks were strict, so we relaxed: {relaxed.join("; ")}.
        </p>
      )}

      {runnersUp.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-neutral-400">
            Other good options
          </h3>
          <ul className="mt-3 space-y-3">
            {runnersUp.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Poster movie={m} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {m.title}{" "}
                    <span className="text-neutral-500">({m.year})</span>
                  </p>
                  <p className="truncate text-xs text-neutral-400">{m.why}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onTryAgain}
        disabled={retrying}
        className="mt-6 w-full rounded-lg border border-neutral-600 px-4 py-2.5 font-semibold text-neutral-100 transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {retrying ? "Finding another…" : "Try again"}
      </button>
    </div>
  );
}
