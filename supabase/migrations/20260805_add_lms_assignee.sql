alter table public.campaign_form_submissions
  add column if not exists assigned_user_id uuid references public.users(id) on delete set null;

alter table public.campaign_form_submissions
  add column if not exists assigned_at timestamptz;

create index if not exists campaign_form_submissions_assigned_user_idx
  on public.campaign_form_submissions (assigned_user_id)
  where assigned_user_id is not null;
