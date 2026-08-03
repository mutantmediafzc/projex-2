create table if not exists public.campaign_form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_slug text not null check (form_slug in ('mm26-aeo', 'mm26-pm')),
  source_url text not null,
  website text not null,
  email text not null,
  authenticated_user_id uuid not null references auth.users(id),
  authenticated_user_email text not null,
  questionnaire jsonb not null check (jsonb_typeof(questionnaire) = 'array'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists campaign_form_submissions_form_slug_created_at_idx
  on public.campaign_form_submissions (form_slug, created_at desc);

alter table public.campaign_form_submissions enable row level security;

comment on table public.campaign_form_submissions is
  'Validated submissions from the mm26-aeo and mm26-pm campaign forms. Writes use the server-side service role.';
