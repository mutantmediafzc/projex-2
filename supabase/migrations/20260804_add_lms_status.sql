alter table public.campaign_form_submissions
  add column if not exists lead_status text not null default 'new_lead';

alter table public.campaign_form_submissions
  drop constraint if exists campaign_form_submissions_lead_status_check;

alter table public.campaign_form_submissions
  add constraint campaign_form_submissions_lead_status_check check (
    lead_status in (
      'new_lead',
      'contacted_initially',
      'follow_up',
      'qualified',
      'call_booked',
      'proposal_sent',
      'for_invoicing',
      'won',
      'lost'
    )
  );

alter table public.campaign_form_submissions
  add column if not exists lead_status_updated_at timestamptz not null default now();

create index if not exists campaign_form_submissions_lead_status_idx
  on public.campaign_form_submissions (lead_status, created_at desc);
