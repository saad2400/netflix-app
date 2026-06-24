// Server-side session helpers shared by the API routes.
import { getAdminClient } from "../supabaseAdmin";
import { runMatch } from "../match";
import { DEFAULT_PREFERENCES, type Preferences } from "../types";

// Unambiguous code alphabet (no 0/O/1/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeCode(len = 6): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export async function createSession(region: string, clientId: string) {
  const db = getAdminClient();

  // Retry a few times on the rare code collision.
  let code = makeCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db
      .from("sessions")
      .insert({ code, region, status: "waiting" })
      .select()
      .single();

    if (!error && data) {
      await db.from("participants").insert({
        session_id: data.id,
        client_id: clientId,
        label: "User 1",
        submitted: false,
      });
      return { code };
    }
    // 23505 = unique violation -> regenerate and retry.
    if (error && (error as { code?: string }).code === "23505") {
      code = makeCode();
      continue;
    }
    throw new Error(error?.message ?? "Failed to create session");
  }
  throw new Error("Could not allocate a unique session code");
}

export async function joinSession(code: string, clientId: string) {
  const db = getAdminClient();

  const { data: session, error } = await db
    .from("sessions")
    .select("*")
    .eq("code", code)
    .single();

  if (error || !session) {
    return { ok: false as const, reason: "not_found" };
  }

  const { data: participants } = await db
    .from("participants")
    .select("*")
    .eq("session_id", session.id);

  const existing = (participants ?? []).find((p) => p.client_id === clientId);
  if (existing) {
    return { ok: true as const, rejoined: true };
  }

  if ((participants ?? []).length >= 2) {
    return { ok: false as const, reason: "full" };
  }

  const label = (participants ?? []).length === 0 ? "User 1" : "User 2";
  await db.from("participants").insert({
    session_id: session.id,
    client_id: clientId,
    label,
    submitted: false,
  });

  return { ok: true as const, rejoined: false };
}

export async function submitPreferences(
  code: string,
  clientId: string,
  prefs: Preferences
) {
  const db = getAdminClient();

  const { data: session } = await db
    .from("sessions")
    .select("*")
    .eq("code", code)
    .single();
  if (!session) return { ok: false as const, reason: "not_found" };

  await db
    .from("participants")
    .update({ prefs, submitted: true })
    .eq("session_id", session.id)
    .eq("client_id", clientId);

  // If both participants have now submitted, compute the match.
  const { data: participants } = await db
    .from("participants")
    .select("*")
    .eq("session_id", session.id);

  const submitted = (participants ?? []).filter((p) => p.submitted);

  if (submitted.length >= 2 && session.status !== "matched") {
    await db.from("sessions").update({ status: "ready" }).eq("id", session.id);
    await computeAndStoreMatch(session.id);
  }

  return { ok: true as const };
}

// Runs the matcher from the two participants' stored prefs and writes the
// result back to the session row (which both browsers observe via realtime).
export async function computeAndStoreMatch(sessionId: string) {
  const db = getAdminClient();

  const { data: session } = await db
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (!session) throw new Error("Session not found");

  const { data: participants } = await db
    .from("participants")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const list = participants ?? [];
  const a = (list[0]?.prefs as Preferences) ?? DEFAULT_PREFERENCES;
  const b = (list[1]?.prefs as Preferences) ?? a;

  const result = await runMatch(a, b, session.region);

  await db
    .from("sessions")
    .update({ status: "matched", result })
    .eq("id", sessionId);

  return result;
}

export async function rerunMatchByCode(code: string) {
  const db = getAdminClient();
  const { data: session } = await db
    .from("sessions")
    .select("id")
    .eq("code", code)
    .single();
  if (!session) return { ok: false as const, reason: "not_found" };
  await computeAndStoreMatch(session.id);
  return { ok: true as const };
}
