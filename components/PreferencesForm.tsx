"use client";

import { useState } from "react";
import { GENRES } from "@/lib/tmdb";
import { DEFAULT_PREFERENCES, type Mood, type Era, type Preferences } from "@/lib/types";

const MOODS: { value: Mood; label: string }[] = [
  { value: "any", label: "Any vibe" },
  { value: "lighthearted", label: "Light-hearted" },
  { value: "intense", label: "Intense" },
  { value: "thoughtful", label: "Thought-provoking" },
  { value: "scary", label: "Scary" },
  { value: "romantic", label: "Romantic" },
];

const ERAS: { value: Era; label: string }[] = [
  { value: "any", label: "Any era" },
  { value: "2020s", label: "2020s" },
  { value: "2010s", label: "2010s" },
  { value: "2000s", label: "2000s" },
  { value: "90s", label: "1990s" },
  { value: "classic", label: "Classics (pre-90s)" },
];

export default function PreferencesForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (prefs: Preferences) => void;
  submitting: boolean;
}) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);

  function toggleGenre(id: number) {
    setPrefs((p) => ({
      ...p,
      genres: p.genres.includes(id)
        ? p.genres.filter((g) => g !== id)
        : [...p.genres, id],
    }));
  }

  const runtimeLabel =
    prefs.maxRuntime >= 240
      ? "No limit"
      : `${Math.floor(prefs.maxRuntime / 60)}h ${prefs.maxRuntime % 60}m`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(prefs);
      }}
      className="rounded-2xl border border-neutral-800 bg-netflix-gray/50 p-6"
    >
      <h2 className="text-lg font-bold">Your taste</h2>
      <p className="mt-1 text-sm text-neutral-400">
        Pick what you&apos;re in the mood for. We&apos;ll blend it with your
        partner&apos;s.
      </p>

      {/* Genres */}
      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-neutral-300">Genres</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {GENRES.map((g) => {
            const active = prefs.genres.includes(g.id);
            return (
              <button
                type="button"
                key={g.id}
                onClick={() => toggleGenre(g.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-netflix-red bg-netflix-red text-white"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                }`}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Mood + Era */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-neutral-300">
          Mood / vibe
          <select
            value={prefs.mood}
            onChange={(e) => setPrefs((p) => ({ ...p, mood: e.target.value as Mood }))}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-netflix-dark px-3 py-2 text-neutral-100"
          >
            {MOODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-neutral-300">
          Era
          <select
            value={prefs.era}
            onChange={(e) => setPrefs((p) => ({ ...p, era: e.target.value as Era }))}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-netflix-dark px-3 py-2 text-neutral-100"
          >
            {ERAS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Sliders */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block text-sm text-neutral-300">
          <span className="flex justify-between">
            <span>Minimum rating</span>
            <span className="font-semibold text-neutral-100">
              {prefs.minRating.toFixed(1)}★
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={9}
            step={0.5}
            value={prefs.minRating}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, minRating: Number(e.target.value) }))
            }
            className="mt-2 w-full"
          />
        </label>

        <label className="block text-sm text-neutral-300">
          <span className="flex justify-between">
            <span>Max runtime</span>
            <span className="font-semibold text-neutral-100">{runtimeLabel}</span>
          </span>
          <input
            type="range"
            min={60}
            max={240}
            step={15}
            value={prefs.maxRuntime}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, maxRuntime: Number(e.target.value) }))
            }
            className="mt-2 w-full"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-lg bg-netflix-red px-4 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "I'm ready"}
      </button>
    </form>
  );
}
