-- Allow tasks to be attached directly to campaign leads.
alter table public.tasks
  alter column patient_id drop not null;

alter table public.tasks
  add column if not exists lead_submission_id uuid references public.campaign_form_submissions(id) on delete cascade;

alter table public.tasks
  add column if not exists reminder_enabled boolean not null default false;

create index if not exists tasks_lead_submission_id_idx
  on public.tasks (lead_submission_id)
  where lead_submission_id is not null;

-- Keep the task type selector useful for lead follow-up workflows.
alter type task_type add value if not exists 'meeting';
alter type task_type add value if not exists 'lunch';
alter type task_type add value if not exists 'deadline';
alter type task_type add value if not exists 'linkedin';
