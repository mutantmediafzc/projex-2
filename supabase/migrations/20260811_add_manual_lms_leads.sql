alter table public.campaign_form_submissions
  add column if not exists lead_name text,
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists pipeline text not null default 'Mutant Leads',
  add column if not exists amount numeric(12, 2) not null default 0 check (amount >= 0),
  add column if not exists close_date date;

alter table public.campaign_form_submissions
  drop constraint if exists campaign_form_submissions_form_slug_check;

alter table public.campaign_form_submissions
  add constraint campaign_form_submissions_form_slug_check check (
    form_slug in ('mm26-aeo', 'mm26-pm', 'manual')
  );

create index if not exists campaign_form_submissions_contact_idx
  on public.campaign_form_submissions (contact_id)
  where contact_id is not null;

create index if not exists campaign_form_submissions_company_idx
  on public.campaign_form_submissions (company_id)
  where company_id is not null;
