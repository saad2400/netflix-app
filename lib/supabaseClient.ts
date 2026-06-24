"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Browser client — uses the public anon key. Safe to ship to the client.
// Used for reads + realtime subscriptions only; all writes go through /api routes.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaces a clear message in dev if env vars are missing.
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

export const supabase = createClient<Database>(url ?? "", anonKey ?? "", {
  realtime: { params: { eventsPerSecond: 5 } },
});
