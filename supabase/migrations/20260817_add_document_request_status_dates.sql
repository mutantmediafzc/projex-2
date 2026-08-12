alter table public.document_requests
  add column if not exists completed_at timestamptz,
  add column if not exists rejected_at timestamptz;

update public.document_requests
set completed_at = updated_at
where status = 'completed'
  and completed_at is null;

update public.document_requests
set rejected_at = updated_at
where status = 'rejected'
  and rejected_at is null;
