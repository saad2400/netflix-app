import { NextResponse } from "next/server";
import { rerunMatchByCode } from "@/lib/server/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Re-run the match for an existing session (the "Try again" button).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = String(body.code ?? "").toUpperCase().trim();
    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }
    const result = await rerunMatchByCode(code);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
