-- Activity Monitor module
-- Tracks what CRM users have open on screen, and whether they are active or
-- idle, between CRM check-in and check-out. Data is sent by the Mutant CRM
-- Tracker desktop app (desktop-agent/ in this repository).
--
-- This migration does NOT modify any existing table. The only existing table it
-- references is public.users (team members).
--
-- All reads and writes go through the Next.js API using the service role key.
-- RLS is enabled with no policies, so the anon / authenticated keys cannot read
-- or write these tables directly from the browser.
--
-- Safe to run more than once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. activity_settings: one row of global tracking settings
-- ---------------------------------------------------------------------------
create table if not exists public.activity_settings (
  id smallint primary key default 1 check (id = 1),
  -- Seconds without keyboard or mouse input before a user counts as idle.
  idle_threshold_seconds integer not null default 300
    check (idle_threshold_seconds between 60 and 3600),
  -- Record window titles (e.g. "Chrome: Meta Ads Manager"). When false only
  -- the application name is stored.
  capture_window_titles boolean not null default true,
  screenshots_enabled boolean not null default false,
  screenshot_interval_minutes integer not null default 10
    check (screenshot_interval_minutes between 1 and 120),
  -- Blur screenshots on the user's PC before upload (recommended for privacy).
  screenshot_blur boolean not null default true,
  -- Activity rows and screenshots older than this are deleted automatically.
  retention_days integer not null default 90
    check (retention_days between 7 and 730),
  -- Bump this when the monitoring notice changes; every user must accept the
  -- new version in the desktop app before tracking resumes.
  policy_version text not null default '2026-11-v1',
  last_purged_at timestamptz,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.activity_settings (id) values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. activity_consents: monitoring notice accepted by each user
-- ---------------------------------------------------------------------------
create table if not exists public.activity_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  policy_version text not null,
  device_name text,
  accepted_at timestamptz not null default now(),
  unique (user_id, policy_version)
);

-- ---------------------------------------------------------------------------
-- 3. work_sessions: one row per check-in -> check-out
-- ---------------------------------------------------------------------------
create table if not exists public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  checkin_source text not null default 'crm'
    check (checkin_source in ('crm', 'agent')),
  checkout_reason text
    check (checkout_reason in ('manual', 'agent', 'auto_stale', 'admin')),

  -- Running totals, maintained by the activity_segments trigger below.
  active_seconds integer not null default 0 check (active_seconds >= 0),
  idle_seconds integer not null default 0 check (idle_seconds >= 0),

  -- Live state reported by the desktop app on every heartbeat.
  last_heartbeat_at timestamptz,
  current_app text,
  current_title text,
  current_domain text,
  current_is_idle boolean,
  agent_device text,
  agent_os text,
  agent_version text,

  created_at timestamptz not null default now(),

  constraint work_sessions_checkout_after_checkin check (
    checked_out_at is null or checked_out_at >= checked_in_at
  ),
  constraint work_sessions_checkout_consistency check (
    (checked_out_at is null and checkout_reason is null)
    or (checked_out_at is not null and checkout_reason is not null)
  )
);

-- A user can only have one open session at a time.
create unique index if not exists uq_work_sessions_one_open_per_user
  on public.work_sessions (user_id)
  where checked_out_at is null;

create index if not exists idx_work_sessions_user_checked_in
  on public.work_sessions (user_id, checked_in_at desc);

create index if not exists idx_work_sessions_checked_in
  on public.work_sessions (checked_in_at desc);

-- ---------------------------------------------------------------------------
-- 4. activity_segments: continuous stretches of one app/window, active or idle
-- ---------------------------------------------------------------------------
create table if not exists public.activity_segments (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.work_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds between 0 and 3600),
  app_name text not null default 'Unknown',
  window_title text,
  url_domain text,
  is_idle boolean not null default false,
  created_at timestamptz not null default now(),
  constraint activity_segments_order check (ended_at >= started_at),
  -- The desktop app retries failed uploads; this makes retries harmless.
  unique (session_id, started_at)
);

create index if not exists idx_activity_segments_user_started
  on public.activity_segments (user_id, started_at desc);

create index if not exists idx_activity_segments_started
  on public.activity_segments (started_at);

-- Keep work_sessions.active_seconds / idle_seconds in sync. Only fires for rows
-- actually inserted, so duplicate retries (ON CONFLICT DO NOTHING) are ignored.
create or replace function public.activity_segments_add_totals()
returns trigger
language plpgsql
as $$
begin
  update public.work_sessions
     set active_seconds = active_seconds + case when new.is_idle then 0 else new.duration_seconds end,
         idle_seconds   = idle_seconds   + case when new.is_idle then new.duration_seconds else 0 end
   where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists trg_activity_segments_add_totals on public.activity_segments;
create trigger trg_activity_segments_add_totals
  after insert on public.activity_segments
  for each row execute function public.activity_segments_add_totals();

-- ---------------------------------------------------------------------------
-- 5. activity_screenshots: optional periodic screenshots (off by default)
-- ---------------------------------------------------------------------------
create table if not exists public.activity_screenshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.work_sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  captured_at timestamptz not null,
  storage_path text not null unique,
  app_name text,
  window_title text,
  is_blurred boolean not null default true,
  created_at timestamptz not null default now(),
  unique (session_id, captured_at)
);

create index if not exists idx_activity_screenshots_user_captured
  on public.activity_screenshots (user_id, captured_at desc);

-- Private storage bucket for screenshots (max 2 MB each, JPEG/PNG only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('activity-screenshots', 'activity-screenshots', false, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 6. Helper: close sessions left open (user forgot to check out, PC died)
-- ---------------------------------------------------------------------------
-- A session is stale when nothing has been heard from it for p_stale_minutes.
-- It is closed at the last heartbeat (or at check-in if the desktop app never
-- connected), so forgotten sessions never inflate worked hours.
create or replace function public.activity_close_stale_sessions(p_stale_minutes integer default 720)
returns integer
language plpgsql
as $$
declare
  closed_count integer;
begin
  update public.work_sessions
     set checked_out_at = greatest(checked_in_at, coalesce(last_heartbeat_at, checked_in_at)),
         checkout_reason = 'auto_stale'
   where checked_out_at is null
     and coalesce(last_heartbeat_at, checked_in_at) < now() - make_interval(mins => p_stale_minutes);
  get diagnostics closed_count = row_count;
  return closed_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Row level security: service role only
-- ---------------------------------------------------------------------------
alter table public.activity_settings enable row level security;
alter table public.activity_consents enable row level security;
alter table public.work_sessions enable row level security;
alter table public.activity_segments enable row level security;
alter table public.activity_screenshots enable row level security;

revoke all on public.activity_settings from anon, authenticated;
revoke all on public.activity_consents from anon, authenticated;
revoke all on public.work_sessions from anon, authenticated;
revoke all on public.activity_segments from anon, authenticated;
revoke all on public.activity_screenshots from anon, authenticated;

revoke all on function public.activity_close_stale_sessions(integer) from public, anon, authenticated;
revoke all on function public.activity_segments_add_totals() from public, anon, authenticated;
