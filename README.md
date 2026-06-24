# What Should We Watch? 🍿

A two-person Netflix matchmaker. Both people join the **same live session**, each
enters their own preferences (genres, mood/vibe, era, minimum rating, max
runtime), and the app picks the **single best Netflix movie for both** — plus a
few runners-up — and shows it to both people in real time.

## How it works

- **Movies / Netflix catalogue:** [TMDB](https://www.themoviedb.org/) Discover API,
  filtered to Netflix via `with_watch_providers=8` + `watch_region`. (Netflix has
  no public API; this is the standard free way to get Netflix-specific titles.)
- **Live sessions:** [Supabase](https://supabase.com) Postgres + Realtime — both
  browsers subscribe to the session and see each other's status instantly.
- **Stack:** Next.js (App Router) + TypeScript + Tailwind. Deploys to Vercel.
- **Matching:** combines both users' genres/mood/era, enforces the stricter rating
  and runtime, scores candidates (rewarding titles that satisfy *both*), and
  gracefully relaxes filters if the combination is too narrow.

## Setup

### 1. Get a free TMDB API key
themoviedb.org → **Settings → API**. Either the **v3 API key** or the **v4 Read
Access Token** works.

### 2. Create a free Supabase project
supabase.com → **New project**. Then:
- **SQL Editor → New query** → paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
- **Project Settings → API** → copy the **Project URL**, the **anon public** key,
  and the **service_role** key.

### 3. Configure env vars
Copy the example and fill it in:

```bash
cp .env.local.example .env.local
```

```
TMDB_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. To test the two-person flow, open a **second browser
or an incognito window** (each browser is treated as a separate person). Create a
session in one, copy the link/code, join from the other.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. vercel.com → **New Project** → import the repo.
3. Add the four env vars above in **Settings → Environment Variables**.
4. Deploy. Share the public URL — both users can be on different devices.

## Project layout

```
app/
  page.tsx                 home (create / join)
  session/[code]/page.tsx  the shared room
  api/session              create + join
  api/preferences          submit a user's prefs (auto-runs match when both ready)
  api/match                re-run match ("Try again")
components/                HomeClient, SessionRoom (realtime), PreferencesForm, ResultCard
lib/
  tmdb.ts                  TMDB / Netflix discover + genre & region maps
  match.ts                 scoring algorithm + fallback relaxation
  server/sessions.ts       session create/join/submit/match persistence
  supabaseClient.ts        browser client (anon key, realtime)
  supabaseAdmin.ts         server client (service role)
supabase/schema.sql        database schema, RLS, realtime publication
```

> Not affiliated with Netflix. Title data and streaming availability come from TMDB.
