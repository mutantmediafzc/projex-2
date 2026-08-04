create table if not exists public.campaign_lead_status_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.campaign_form_submissions(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by_id uuid references auth.users(id) on delete set null,
  changed_by_email text,
  changed_at timestamptz not null default now()
);

create index if not exists campaign_lead_status_history_submission_idx
  on public.campaign_lead_status_history (submission_id, changed_at desc);

alter table public.campaign_lead_status_history enable row level security;

comment on table public.campaign_lead_status_history is
  'Audit log of LMS pipeline stage changes. Reads and writes use authenticated server endpoints.';
