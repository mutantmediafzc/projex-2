-- Retain financial history while removing deleted invoices from all client queries.
create table public.invoice_deletions (
  invoice_id uuid primary key references public.invoices(id) on delete cascade,
  deleted_by uuid not null references auth.users(id),
  deleted_at timestamptz not null default now()
);

create index invoice_deletions_deleted_by_idx on public.invoice_deletions(deleted_by);

alter table public.invoice_deletions enable row level security;
revoke all on public.invoice_deletions from anon, authenticated;
grant select (invoice_id) on public.invoice_deletions to anon, authenticated;
grant all on public.invoice_deletions to service_role;

-- Clients can check visibility but only the authenticated server endpoint writes markers.
create policy "Read invoice deletion markers"
  on public.invoice_deletions for select to anon, authenticated using (true);

-- Invoices previously had RLS disabled. Preserve that access for ordinary rows;
-- a restrictive SELECT policy alone would deny all invoice reads and writes.
-- Do not broaden policies in environments where RLS is already enabled.
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.invoices'::regclass) then
    create policy "Preserve existing invoice access"
      on public.invoices as permissive for all to anon, authenticated
      using (true) with check (true);
  end if;
end;
$$;
alter table public.invoices enable row level security;

create policy "Exclude deleted invoices"
  on public.invoices as restrictive for select to anon, authenticated
  using (not exists (
    select 1 from public.invoice_deletions d where d.invoice_id = invoices.id
  ));
