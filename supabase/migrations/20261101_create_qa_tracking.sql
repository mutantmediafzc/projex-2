-- QA Tracking module
-- Standalone tables for tracking the quality of team PR testing.
--
-- This migration does NOT modify any existing table. The only existing table it
-- references is public.users (team members). No links to projects, tasks,
-- companies or any other module.
--
-- All reads and writes go through the Next.js API using the service role key.
-- RLS is enabled with no policies, so the anon / authenticated keys cannot read
-- or write these tables directly from the browser.
--
-- Safe to run more than once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. qa_projects: QA-only projects (name + team)
-- ---------------------------------------------------------------------------
create table if not exists public.qa_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_qa_projects_created_at
  on public.qa_projects (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. qa_project_members: team working on a QA project
-- ---------------------------------------------------------------------------
create table if not exists public.qa_project_members (
  project_id uuid not null references public.qa_projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists idx_qa_project_members_user_id
  on public.qa_project_members (user_id);

-- ---------------------------------------------------------------------------
-- 3. qa_tasks: one task link per team member per PR
-- ---------------------------------------------------------------------------
create table if not exists public.qa_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.qa_projects(id) on delete cascade,
  assignee_id uuid not null references public.users(id) on delete restrict,

  -- Unguessable token used in the member link: /public/qa/{token}
  public_token text not null unique,

  -- Filled by the team member (can be pre-filled by the QA lead).
  title text not null default '',
  description text not null default '',
  pr_url text not null default '',
  -- Ordered list of breakdown items: ["Build API", "Add UI", ...]
  breakdown jsonb not null default '[]'::jsonb
    check (jsonb_typeof(breakdown) = 'array'),

  -- Lifecycle: draft -> submitted (locked for the member forever)
  status text not null default 'draft'
    check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  submitted_by_name text,

  -- QA lead review of the whole task
  review_status text not null default 'pending'
    check (review_status in ('pending', 'passed', 'bugs_found')),
  review_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,

  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint qa_tasks_submitted_consistency check (
    (status = 'draft' and submitted_at is null)
    or (status = 'submitted' and submitted_at is not null and submitted_by_name is not null)
  )
);

create index if not exists idx_qa_tasks_project_id on public.qa_tasks (project_id);
create index if not exists idx_qa_tasks_assignee_id on public.qa_tasks (assignee_id);
create index if not exists idx_qa_tasks_status on public.qa_tasks (status);
create index if not exists idx_qa_tasks_review_status on public.qa_tasks (review_status);
create index if not exists idx_qa_tasks_created_at on public.qa_tasks (created_at desc);

-- ---------------------------------------------------------------------------
-- 4. qa_test_cases: every test case the member ran for the PR
-- ---------------------------------------------------------------------------
create table if not exists public.qa_test_cases (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.qa_tasks(id) on delete cascade,
  position integer not null default 0,

  -- Written by the member
  title text not null check (char_length(btrim(title)) > 0),
  steps text not null default '',
  expected_result text not null default '',
  status text not null default 'not_run'
    check (status in ('not_run', 'passed', 'failed', 'blocked')),
  comment text not null default '',

  -- Written by the QA lead
  review_status text not null default 'pending'
    check (review_status in ('pending', 'verified', 'bug')),
  review_comment text,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_qa_test_cases_task_id
  on public.qa_test_cases (task_id, position);

-- ---------------------------------------------------------------------------
-- 5. qa_task_events: full history / audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.qa_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.qa_tasks(id) on delete cascade,
  event_type text not null,
  actor_id uuid references public.users(id) on delete set null,
  actor_name text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_qa_task_events_task_id
  on public.qa_task_events (task_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.qa_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_qa_projects_updated_at on public.qa_projects;
create trigger trg_qa_projects_updated_at
  before update on public.qa_projects
  for each row execute function public.qa_set_updated_at();

drop trigger if exists trg_qa_tasks_updated_at on public.qa_tasks;
create trigger trg_qa_tasks_updated_at
  before update on public.qa_tasks
  for each row execute function public.qa_set_updated_at();

drop trigger if exists trg_qa_test_cases_updated_at on public.qa_test_cases;
create trigger trg_qa_test_cases_updated_at
  before update on public.qa_test_cases
  for each row execute function public.qa_set_updated_at();

-- ---------------------------------------------------------------------------
-- Lock rules: once a task is submitted, the member's work can never change.
-- Enforced in the database so no API bug can bypass it.
-- Only the QA lead review columns stay editable.
-- ---------------------------------------------------------------------------
create or replace function public.qa_tasks_enforce_lock()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'submitted' then
    if new.status is distinct from old.status
      or new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.pr_url is distinct from old.pr_url
      or new.breakdown is distinct from old.breakdown
      or new.submitted_at is distinct from old.submitted_at
      or new.submitted_by_name is distinct from old.submitted_by_name
      or new.assignee_id is distinct from old.assignee_id
      or new.project_id is distinct from old.project_id
      or new.public_token is distinct from old.public_token
    then
      raise exception 'QA task % is submitted and locked', old.id
        using errcode = 'P0001';
    end if;
  end if;

  if old.status = 'draft' and new.review_status <> 'pending' then
    raise exception 'QA task % cannot be reviewed before it is submitted', old.id
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_qa_tasks_enforce_lock on public.qa_tasks;
create trigger trg_qa_tasks_enforce_lock
  before update on public.qa_tasks
  for each row execute function public.qa_tasks_enforce_lock();

-- When the QA lead deletes a whole task, the cascade must be able to remove its
-- (locked) cases. The task delete trigger flags the task id for this transaction.
create or replace function public.qa_tasks_before_delete()
returns trigger
language plpgsql
as $$
begin
  perform set_config('qa.deleting_task', old.id::text, true);
  return old;
end;
$$;

create or replace function public.qa_test_cases_enforce_lock()
returns trigger
language plpgsql
as $$
declare
  v_task_id uuid;
  v_status text;
begin
  v_task_id := coalesce(new.task_id, old.task_id);

  if tg_op = 'DELETE'
    and current_setting('qa.deleting_task', true) = v_task_id::text then
    return old;
  end if;

  select status into v_status from public.qa_tasks where id = v_task_id;

  if v_status is null then
    return coalesce(new, old);
  end if;

  if v_status = 'submitted' then
    if tg_op = 'INSERT' then
      raise exception 'Cannot add test cases to a submitted QA task'
        using errcode = 'P0001';
    elsif tg_op = 'DELETE' then
      raise exception 'Cannot delete test cases from a submitted QA task'
        using errcode = 'P0001';
    elsif new.task_id is distinct from old.task_id
      or new.position is distinct from old.position
      or new.title is distinct from old.title
      or new.steps is distinct from old.steps
      or new.expected_result is distinct from old.expected_result
      or new.status is distinct from old.status
      or new.comment is distinct from old.comment
    then
      raise exception 'Test cases of a submitted QA task are locked'
        using errcode = 'P0001';
    end if;
  elsif tg_op = 'UPDATE' and new.review_status <> 'pending' then
    raise exception 'Test cases cannot be reviewed before the task is submitted'
      using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_qa_test_cases_enforce_lock on public.qa_test_cases;
create trigger trg_qa_test_cases_enforce_lock
  before insert or update or delete on public.qa_test_cases
  for each row execute function public.qa_test_cases_enforce_lock();

drop trigger if exists trg_qa_tasks_before_delete on public.qa_tasks;
create trigger trg_qa_tasks_before_delete
  before delete on public.qa_tasks
  for each row execute function public.qa_tasks_before_delete();

-- ---------------------------------------------------------------------------
-- Atomic save / submit used by the member link.
-- Replaces the draft content and test cases in one transaction. When
-- p_submit is true it validates the work and locks the task.
-- ---------------------------------------------------------------------------
create or replace function public.qa_save_task(
  p_token text,
  p_title text,
  p_description text,
  p_pr_url text,
  p_breakdown jsonb,
  p_cases jsonb,
  p_submit boolean default false
)
returns uuid
language plpgsql
as $$
declare
  v_task public.qa_tasks%rowtype;
  v_member_name text;
  v_case jsonb;
  v_pos integer := 0;
  v_case_count integer;
  v_incomplete integer;
begin
  select * into v_task from public.qa_tasks
    where public_token = p_token
    for update;

  if not found then
    raise exception 'QA task not found' using errcode = 'P0002';
  end if;

  if v_task.status = 'submitted' then
    raise exception 'This QA task has already been submitted and is locked'
      using errcode = 'P0001';
  end if;

  if p_breakdown is null or jsonb_typeof(p_breakdown) <> 'array' then
    p_breakdown := '[]'::jsonb;
  end if;
  if p_cases is null or jsonb_typeof(p_cases) <> 'array' then
    p_cases := '[]'::jsonb;
  end if;

  update public.qa_tasks set
    title = coalesce(btrim(p_title), ''),
    description = coalesce(p_description, ''),
    pr_url = coalesce(btrim(p_pr_url), ''),
    breakdown = p_breakdown
  where id = v_task.id;

  delete from public.qa_test_cases where task_id = v_task.id;

  for v_case in select * from jsonb_array_elements(p_cases) loop
    if coalesce(btrim(v_case->>'title'), '') <> '' then
      insert into public.qa_test_cases
        (task_id, position, title, steps, expected_result, status, comment)
      values (
        v_task.id,
        v_pos,
        btrim(v_case->>'title'),
        coalesce(v_case->>'steps', ''),
        coalesce(v_case->>'expected_result', ''),
        case when v_case->>'status' in ('passed', 'failed', 'blocked')
          then v_case->>'status' else 'not_run' end,
        coalesce(v_case->>'comment', '')
      );
      v_pos := v_pos + 1;
    end if;
  end loop;

  if p_submit then
    if coalesce(btrim(p_title), '') = '' then
      raise exception 'Task title is required' using errcode = '22023';
    end if;
    if coalesce(btrim(p_description), '') = '' then
      raise exception 'Task description is required' using errcode = '22023';
    end if;
    if coalesce(btrim(p_pr_url), '') = '' then
      raise exception 'PR link is required' using errcode = '22023';
    end if;
    if jsonb_array_length(p_breakdown) = 0 then
      raise exception 'Add at least one breakdown item' using errcode = '22023';
    end if;

    select count(*),
           count(*) filter (where status = 'not_run'
             or (status in ('failed', 'blocked') and btrim(comment) = ''))
      into v_case_count, v_incomplete
      from public.qa_test_cases where task_id = v_task.id;

    if v_case_count = 0 then
      raise exception 'Add at least one test case' using errcode = '22023';
    end if;
    if v_incomplete > 0 then
      raise exception 'Every test case needs a result, and failed or blocked cases need a comment'
        using errcode = '22023';
    end if;

    select coalesce(nullif(btrim(full_name), ''), email, 'Team member')
      into v_member_name
      from public.users where id = v_task.assignee_id;

    update public.qa_tasks set
      status = 'submitted',
      submitted_at = now(),
      submitted_by_name = coalesce(v_member_name, 'Team member')
    where id = v_task.id;

    insert into public.qa_task_events (task_id, event_type, actor_id, actor_name, details)
    values (v_task.id, 'submitted', v_task.assignee_id, v_member_name,
      jsonb_build_object('case_count', v_case_count));
  end if;

  return v_task.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: service role only (API routes enforce access rules).
-- ---------------------------------------------------------------------------
alter table public.qa_projects enable row level security;
alter table public.qa_project_members enable row level security;
alter table public.qa_tasks enable row level security;
alter table public.qa_test_cases enable row level security;
alter table public.qa_task_events enable row level security;

revoke all on function public.qa_save_task(text, text, text, text, jsonb, jsonb, boolean) from public;
revoke all on function public.qa_save_task(text, text, text, text, jsonb, jsonb, boolean) from anon, authenticated;
grant execute on function public.qa_save_task(text, text, text, text, jsonb, jsonb, boolean) to service_role;
