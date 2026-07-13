do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
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

update invoices
set status = 'active',
    updated_at = now()
where invoice_type = 'invoice'
  and status = 'draft';
