"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getClientId } from "@/lib/clientId";

export default function HomeClient({
  regions,
}: {
  regions: { code: string; name: string }[];
}) {
  const router = useRouter();
  const [region, setRegion] = useState("PK");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createSession() {
    setError(null);
    setLoading("create");
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          region,
          clientId: getClientId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create session");
      router.push(`/session/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(null);
    }
  }

  async function joinSession() {
    setError(null);
    const code = joinCode.toUpperCase().trim();
    if (!code) {
      setError("Enter a session code");
      return;
    }
    setLoading("join");
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          code,
          clientId: getClientId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error === "full"
            ? "That session already has two people."
            : data.error === "not_found"
              ? "No session found with that code."
              : data.error ?? "Could not join session"
        );
      }
      router.push(`/session/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(null);
    }
  }

  return (
    <div className="mt-10 grid w-full gap-4 sm:grid-cols-2">
      {/* Create */}
      <div className="rounded-2xl border border-neutral-800 bg-netflix-gray/60 p-6">
        <h2 className="text-lg font-bold">Start a session</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Pick the Netflix region you both watch.
        </p>
        <label className="mt-4 block text-sm text-neutral-300">
          Netflix region
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-netflix-dark px-3 py-2 text-neutral-100"
          >
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={createSession}
          disabled={loading !== null}
          className="mt-5 w-full rounded-lg bg-netflix-red px-4 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {loading === "create" ? "Creating…" : "Create session"}
        </button>
      </div>

      {/* Join */}
      <div className="rounded-2xl border border-neutral-800 bg-netflix-gray/60 p-6">
        <h2 className="text-lg font-bold">Join a session</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Got a code from your partner? Enter it here.
        </p>
        <label className="mt-4 block text-sm text-neutral-300">
          Session code
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && joinSession()}
            placeholder="e.g. K7P2QX"
            maxLength={6}
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-netflix-dark px-3 py-2 font-mono text-lg tracking-widest text-neutral-100"
          />
        </label>
        <button
          onClick={joinSession}
          disabled={loading !== null}
          className="mt-5 w-full rounded-lg border border-neutral-600 px-4 py-2.5 font-semibold text-neutral-100 transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading === "join" ? "Joining…" : "Join session"}
        </button>
      </div>

      {error && (
        <p className="sm:col-span-2 rounded-lg bg-red-950/60 px-4 py-2 text-center text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
