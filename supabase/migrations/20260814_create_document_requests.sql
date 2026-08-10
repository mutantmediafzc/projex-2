create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  document_type text not null check (document_type in (
    'Certificate of Employment',
    'NOC',
    'Salary Certificate',
    'Employment Release Letter'
  )),
  addressed_to text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_requests_user_id_created_at_idx
  on public.document_requests (user_id, created_at desc);

alter table public.document_requests enable row level security;

create policy "Employees can view their document requests"
  on public.document_requests for select
  using (auth.uid() = user_id);

create policy "Employees can create document requests"
  on public.document_requests for insert
  with check (auth.uid() = user_id);
