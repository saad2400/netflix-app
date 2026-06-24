-- ============================================================================
--  "What Should We Watch?" — Supabase schema
--  Run this in the Supabase SQL editor (Project -> SQL -> New query).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  region      text not null default 'PK',
  status      text not null default 'waiting',  -- waiting | ready | matched
  result      jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists sessions_code_idx on public.sessions (code);

-- ---------------------------------------------------------------------------
-- participants (max 2 per session, enforced in application logic)
-- ---------------------------------------------------------------------------
create table if not exists public.participants (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  client_id   text not null,
  label       text not null,
  prefs       jsonb,
  submitted   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (session_id, client_id)
);

create index if not exists participants_session_idx on public.participants (session_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- v1 shared-session model: there are no user accounts. Anyone holding a
-- session code can read/write that session. The browser uses the anon key for
-- reads + realtime; all writes go through server routes using the service-role
-- key (which bypasses RLS). We therefore allow public SELECT (so realtime works
-- for both browsers) and rely on the unguessable code + server-side writes.
-- ---------------------------------------------------------------------------
alter table public.sessions     enable row level security;
alter table public.participants enable row level security;

drop policy if exists "sessions readable" on public.sessions;
create policy "sessions readable"
  on public.sessions for select
  using (true);

drop policy if exists "participants readable" on public.participants;
create policy "participants readable"
  on public.participants for select
  using (true);

-- ---------------------------------------------------------------------------
-- Realtime: publish both tables so client subscriptions receive changes.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.participants;
