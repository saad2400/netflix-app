import { NextResponse } from "next/server";
import { submitPreferences } from "@/lib/server/sessions";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Coerce/clamp incoming prefs so a malformed body can't break the matcher.
function sanitize(input: unknown): Preferences {
  const p = (input ?? {}) as Partial<Preferences>;
  const genres = Array.isArray(p.genres)
    ? p.genres.filter((g) => typeof g === "number").slice(0, 15)
    : [];
  const mood = (
    ["any", "lighthearted", "intense", "thoughtful", "scary", "romantic"] as const
  ).includes(p.mood as never)
    ? (p.mood as Preferences["mood"])
    : "any";
  const era = (
    ["any", "2020s", "2010s", "2000s", "90s", "classic"] as const
  ).includes(p.era as never)
    ? (p.era as Preferences["era"])
    : "any";
  const minRating = clamp(Number(p.minRating ?? DEFAULT_PREFERENCES.minRating), 0, 10);
  const maxRuntime = clamp(Number(p.maxRuntime ?? DEFAULT_PREFERENCES.maxRuntime), 60, 240);
  return { genres, mood, era, minRating, maxRuntime };
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = String(body.code ?? "").toUpperCase().trim();
    const clientId = body.clientId;

    if (!code || !clientId) {
      return NextResponse.json(
        { error: "Missing code or clientId" },
        { status: 400 }
      );
    }

    const prefs = sanitize(body.prefs);
    const result = await submitPreferences(code, clientId, prefs);

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
