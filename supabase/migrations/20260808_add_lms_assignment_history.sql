alter table public.campaign_lead_status_history
  add column if not exists event_type text not null default 'status_changed',
  add column if not exists assigned_user_id uuid references public.users(id) on delete set null,
  add column if not exists assigned_user_name text;

alter table public.campaign_lead_status_history
  drop constraint if exists campaign_lead_status_history_event_type_check;

alter table public.campaign_lead_status_history
  add constraint campaign_lead_status_history_event_type_check
  check (event_type in ('status_changed', 'assignment_changed'));
