alter table public.document_requests
  add column if not exists denial_reason text;

alter table public.tasks drop constraint if exists tasks_source_check;

alter table public.tasks add constraint tasks_source_check
  check (source in ('operations', 'admin', 'social_workflow', 'leave', 'document_request'));
