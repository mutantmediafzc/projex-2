alter table if exists invoices
  add column if not exists import_source text,
  add column if not exists import_external_id text;

alter table if exists invoice_items
  add column if not exists import_source text,
  add column if not exists import_external_id text;

alter table if exists invoice_payments
  add column if not exists import_source text,
  add column if not exists import_external_id text;

create unique index if not exists invoices_import_external_id_idx
  on invoices(import_external_id)
  where import_source is not null and import_external_id is not null;

create unique index if not exists invoice_items_import_external_id_idx
  on invoice_items(import_external_id)
  where import_source is not null and import_external_id is not null;

create unique index if not exists invoice_payments_import_external_id_idx
  on invoice_payments(import_external_id)
  where import_source is not null and import_external_id is not null;

do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'invoices'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';

  if constraint_name is not null then
    execute format('alter table invoices drop constraint %I', constraint_name);
  end if;

  alter table invoices
    add constraint invoices_status_check
    check (status in ('draft', 'active', 'sent', 'paid', 'unpaid', 'overdue', 'cancelled', 'accepted', 'rejected', 'partially_paid'));
end $$;
