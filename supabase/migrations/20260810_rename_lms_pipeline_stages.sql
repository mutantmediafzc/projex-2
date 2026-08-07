alter table public.campaign_form_submissions
  drop constraint if exists campaign_form_submissions_lead_status_check;

alter table public.campaign_form_submissions
  alter column lead_status drop default;

update public.campaign_form_submissions
set lead_status = case lead_status
  when 'new_lead' then 'campaign_leads'
  when 'contacted_initially' then 'outreach'
  when 'follow_up' then 'audit'
  else lead_status
end
where lead_status in ('new_lead', 'contacted_initially', 'follow_up');

update public.campaign_lead_status_history
set from_status = case from_status
  when 'new_lead' then 'campaign_leads'
  when 'contacted_initially' then 'outreach'
  when 'follow_up' then 'audit'
  else from_status
end
where from_status in ('new_lead', 'contacted_initially', 'follow_up');

update public.campaign_lead_status_history
set to_status = case to_status
  when 'new_lead' then 'campaign_leads'
  when 'contacted_initially' then 'outreach'
  when 'follow_up' then 'audit'
  else to_status
end
where to_status in ('new_lead', 'contacted_initially', 'follow_up');

alter table public.campaign_form_submissions
  alter column lead_status set default 'campaign_leads';

alter table public.campaign_form_submissions
  add constraint campaign_form_submissions_lead_status_check check (
    lead_status in (
      'campaign_leads',
      'outreach',
      'audit',
      'qualified',
      'call_booked',
      'proposal_sent',
      'for_invoicing',
      'won',
      'lost'
    )
  );
