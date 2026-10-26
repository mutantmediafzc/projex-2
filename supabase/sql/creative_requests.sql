-- Creative / Design Request Management
-- Standalone schema for the Design Requests module in Cream CRM.
--
-- IMPORTANT: This script does NOT modify any existing tables. It only creates
-- new feature-specific tables, indexes, constraints, and RLS policies.
--
-- Existing tables referenced (read-only FKs):
--   public.companies  (id uuid pk)  -> Client / Brand
--   public.users      (id uuid pk, references auth.users)  -> internal employees
--
-- Run this manually in the Supabase SQL editor after reviewing.
-- Rollback: run creative_requests_rollback.sql.

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. creative_requests
-- ---------------------------------------------------------------------------
create table if not exists public.creative_requests (
  id uuid primary key default gen_random_uuid(),

  -- Single Client / Brand association (one company per request).
  company_id uuid not null references public.companies(id) on delete restrict,

  request_type text not null,

  -- Internal request creator / request owner.
  requested_by uuid not null references public.users(id) on delete restrict,

  -- Assigned Design or Content team member (nullable until assigned).
  assigned_to uuid references public.users(id) on delete set null,

  status text not null default 'waiting_for_brief'
    check (status in (
      'waiting_for_brief',
      'in_queue',
      'in_progress',
      'for_approval',
      'need_to_action',
      'completed'
    )),

  -- 'internal' = filled inside the CRM; 'public' = filled via public form link.
  submission_source text not null default 'internal'
    check (submission_source in ('internal', 'public')),

  -- Unguessable token for the public form URL (/forms/design-request/{token}).
  public_token text unique,

  -- The 20-field Creative Request Brief answers (JSONB).
  answers jsonb not null default '{}'::jsonb,

  -- Deadline from the request config / questionnaire field 19.
  deadline date,
  deadline_notes text,

  -- Internal-only notes (never exposed to public submitters).
  internal_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index if not exists idx_creative_requests_company_id
  on public.creative_requests (company_id);
create index if not exists idx_creative_requests_requested_by
  on public.creative_requests (requested_by);
create index if not exists idx_creative_requests_assigned_to
  on public.creative_requests (assigned_to);
create index if not exists idx_creative_requests_status
  on public.creative_requests (status);
create index if not exists idx_creative_requests_created_at
  on public.creative_requests (created_at desc);
create index if not exists idx_creative_requests_public_token
  on public.creative_requests (public_token);

-- Auto-update updated_at on row changes.
create or replace function public.creative_requests_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_creative_requests_set_updated_at on public.creative_requests;
create trigger trg_creative_requests_set_updated_at
  before update on public.creative_requests
  for each row execute function public.creative_requests_set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. creative_request_responses (comments + deliverable links)
-- ---------------------------------------------------------------------------
create table if not exists public.creative_request_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.creative_requests(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  user_name text,
  comment text,
  deliverable_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creative_request_responses_request_id
  on public.creative_request_responses (request_id, created_at desc);
create index if not exists idx_creative_request_responses_user_id
  on public.creative_request_responses (user_id);

create or replace function public.creative_request_responses_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_creative_request_responses_set_updated_at on public.creative_request_responses;
create trigger trg_creative_request_responses_set_updated_at
  before update on public.creative_request_responses
  for each row execute function public.creative_request_responses_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. creative_request_notifications (assignment notifications)
-- ---------------------------------------------------------------------------
-- The existing notifications system reuses the `tasks` table, whose `source`
-- check constraint cannot be extended without modifying an existing table
-- (prohibited). This isolated table stores Design Request assignment
-- notifications instead.
create table if not exists public.creative_request_notifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.creative_requests(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);

create index if not exists idx_creative_request_notifications_user_id
  on public.creative_request_notifications (user_id, read_at);
create index if not exists idx_creative_request_notifications_request_id
  on public.creative_request_notifications (request_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- All writes go through API routes using the service-role key, so RLS is
-- enabled and authenticated users can read their own accessible rows.

alter table public.creative_requests enable row level security;
alter table public.creative_request_responses enable row level security;
alter table public.creative_request_notifications enable row level security;

-- creative_requests: authenticated users can read all requests (internal CRM).
drop policy if exists "creative_requests_read_authenticated" on public.creative_requests;
create policy "creative_requests_read_authenticated"
  on public.creative_requests for select
  to authenticated
  using (true);

-- creative_request_responses: authenticated users can read responses.
drop policy if exists "creative_request_responses_read_authenticated" on public.creative_request_responses;
create policy "creative_request_responses_read_authenticated"
  on public.creative_request_responses for select
  to authenticated
  using (true);

-- creative_request_notifications: users can read their own notifications.
drop policy if exists "creative_request_notifications_read_own" on public.creative_request_notifications;
create policy "creative_request_notifications_read_own"
  on public.creative_request_notifications for select
  to authenticated
  using (auth.uid() = user_id);

-- creative_request_notifications: users can update (mark read) their own.
drop policy if exists "creative_request_notifications_update_own" on public.creative_request_notifications;
create policy "creative_request_notifications_update_own"
  on public.creative_request_notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Note: INSERT/UPDATE/DELETE on creative_requests and creative_request_responses
-- are performed exclusively through API routes using the service-role key,
-- which bypasses RLS. No anon/public insert policies are defined to prevent
-- unauthorized public writes. Public form submissions are validated and
-- written server-side via the service-role client.
