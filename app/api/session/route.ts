import { NextResponse } from "next/server";
import { createSession, joinSession } from "@/lib/server/sessions";
import { REGIONS } from "@/lib/tmdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, clientId } = body ?? {};

    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    if (action === "create") {
      const region = REGIONS.some((r) => r.code === body.region)
        ? body.region
        : "PK";
      const { code } = await createSession(region, clientId);
      return NextResponse.json({ code });
    }

    if (action === "join") {
      const code = String(body.code ?? "").toUpperCase().trim();
      if (!code) {
        return NextResponse.json({ error: "Missing code" }, { status: 400 });
      }
      const result = await joinSession(code, clientId);
      if (!result.ok) {
        const status = result.reason === "full" ? 409 : 404;
        return NextResponse.json({ error: result.reason }, { status });
      }
      return NextResponse.json({ ok: true, code, rejoined: result.rejoined });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
