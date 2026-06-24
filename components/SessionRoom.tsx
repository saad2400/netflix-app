"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getClientId } from "@/lib/clientId";
import type { Participant, Preferences, SessionRow } from "@/lib/types";
import PreferencesForm from "./PreferencesForm";
import ResultCard from "./ResultCard";

type JoinError = "full" | "not_found" | "error" | null;

export default function SessionRoom({ code }: { code: string }) {
  const [clientId, setClientId] = useState("");
  const [session, setSession] = useState<SessionRow | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joinError, setJoinError] = useState<JoinError>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState(false);
  const loadedRef = useRef(false);

  // Pull the latest session + participants from Supabase.
  const refresh = useCallback(async () => {
    const { data: s } = await supabase
      .from("sessions")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (!s) return null;
    const sess = s as unknown as SessionRow;
    setSession(sess);

    const { data: p } = await supabase
      .from("participants")
      .select("*")
      .eq("session_id", sess.id)
      .order("created_at", { ascending: true });
    setParticipants((p ?? []) as unknown as Participant[]);
    return sess;
  }, [code]);

  // On mount: ensure we're joined (idempotent), then load + subscribe.
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const id = getClientId();
    setClientId(id);

    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "join", code, clientId: id }),
        });
        const data = await res.json();
        if (!res.ok) {
          setJoinError(data.error === "full" ? "full" : data.error === "not_found" ? "not_found" : "error");
          return;
        }
      } catch {
        setJoinError("error");
        return;
      }

      const sess = await refresh();
      if (!sess) {
        setJoinError("not_found");
        return;
      }

      // Realtime: any change to this session's row or its participants → refresh.
      channel = supabase
        .channel(`session-${sess.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sess.id}` },
          () => refresh()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sess.id}` },
          (payload) => setSession(payload.new as unknown as SessionRow)
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [code, refresh]);

  async function submitPrefs(prefs: Preferences) {
    setSubmitting(true);
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, clientId, prefs }),
      });
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function tryAgain() {
    setRetrying(true);
    try {
      await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      await refresh();
    } finally {
      setRetrying(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable; ignore */
    }
  }

  if (joinError) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-800 bg-netflix-gray/50 p-8 text-center">
        <h1 className="text-xl font-bold">
          {joinError === "full"
            ? "This session is full"
            : joinError === "not_found"
              ? "Session not found"
              : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          {joinError === "full"
            ? "Two people are already in this session."
            : "Double-check the code or start a new session."}
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-netflix-red px-4 py-2 font-semibold text-white hover:bg-red-700"
        >
          Back to start
        </Link>
      </div>
    );
  }

  const me = participants.find((p) => p.client_id === clientId);
  const partner = participants.find((p) => p.client_id !== clientId);
  const result = session?.result ?? null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← Home
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-400">
            Netflix {session?.region ?? ""}
          </span>
          <span className="rounded-lg border border-neutral-700 bg-netflix-dark px-3 py-1.5 font-mono text-lg tracking-widest">
            {code}
          </span>
          <button
            onClick={copyLink}
            className="rounded-lg border border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-800"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>

      {/* Presence row */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <PresenceChip
          name="You"
          label={me?.label}
          present={!!me}
          ready={!!me?.submitted}
        />
        <PresenceChip
          name="Partner"
          label={partner?.label}
          present={!!partner}
          ready={!!partner?.submitted}
          waitingText="Waiting for someone to join — share the code"
        />
      </div>

      {/* Body */}
      <div className="mt-6">
        {result ? (
          <ResultCard result={result} onTryAgain={tryAgain} retrying={retrying} />
        ) : me?.submitted ? (
          <WaitingPanel partnerReady={!!partner?.submitted} partnerPresent={!!partner} />
        ) : (
          <PreferencesForm onSubmit={submitPrefs} submitting={submitting} />
        )}
      </div>
    </div>
  );
}

function PresenceChip({
  name,
  label,
  present,
  ready,
  waitingText,
}: {
  name: string;
  label?: string;
  present: boolean;
  ready: boolean;
  waitingText?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        present ? "border-neutral-700 bg-netflix-gray/40" : "border-dashed border-neutral-800"
      }`}
    >
      <div>
        <p className="font-semibold">
          {name}
          {label ? <span className="text-neutral-500"> · {label}</span> : null}
        </p>
        {!present && waitingText && (
          <p className="text-xs text-neutral-500">{waitingText}</p>
        )}
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          !present
            ? "bg-neutral-800 text-neutral-500"
            : ready
              ? "bg-green-900/60 text-green-300"
              : "bg-amber-900/50 text-amber-300"
        }`}
      >
        {!present ? "Not here" : ready ? "Ready ✓" : "Choosing…"}
      </span>
    </div>
  );
}

function WaitingPanel({
  partnerReady,
  partnerPresent,
}: {
  partnerReady: boolean;
  partnerPresent: boolean;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-netflix-gray/40 p-8 text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-netflix-red" />
      <h2 className="text-lg font-bold">You&apos;re ready ✓</h2>
      <p className="mt-1 text-sm text-neutral-400">
        {!partnerPresent
          ? "Waiting for your partner to join the session…"
          : partnerReady
            ? "Finding the perfect movie for you both…"
            : "Waiting for your partner to finish choosing…"}
      </p>
    </div>
  );
}
