update public.campaign_form_submissions
set pipeline = case form_slug
  when 'mm26-aeo' then 'AEO'
  when 'mm26-pm' then 'Performance Marketing'
  else pipeline
end
where form_slug in ('mm26-aeo', 'mm26-pm');
