create table if not exists public.brevo_api_logs (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  method text not null,
  email text not null,
  list_id integer not null,
  status_code integer,
  success boolean not null,
  response_body text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists brevo_api_logs_created_at_idx
  on public.brevo_api_logs (created_at desc);

create index if not exists brevo_api_logs_email_created_at_idx
  on public.brevo_api_logs (email, created_at desc);

alter table public.brevo_api_logs enable row level security;
