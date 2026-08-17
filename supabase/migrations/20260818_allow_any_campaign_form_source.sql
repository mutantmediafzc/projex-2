alter table public.campaign_form_submissions
  drop constraint if exists campaign_form_submissions_form_slug_check;

comment on table public.campaign_form_submissions is
  'Submissions from authenticated campaign form sources. Writes use the server-side service role.';
