create table if not exists invoice_payment_breakdowns (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null default 'Payment installment',
  amount numeric(12,2) not null check (amount >= 0),
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'paid', 'due', 'cancelled')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_payment_breakdowns_invoice_id_idx
  on invoice_payment_breakdowns(invoice_id);

create or replace function validate_invoice_payment_breakdown_total()
returns trigger
language plpgsql
as $$
declare
  invoice_total numeric(12,2);
  breakdown_total numeric(12,2);
begin
  select total into invoice_total
  from invoices
  where id = new.invoice_id;

  select coalesce(sum(amount), 0) into breakdown_total
  from invoice_payment_breakdowns
  where invoice_id = new.invoice_id;

  if breakdown_total > coalesce(invoice_total, 0) + 0.01 then
    raise exception 'Payment breakdown total cannot exceed invoice total';
  end if;

  return new;
end;
$$;

drop trigger if exists invoice_payment_breakdown_total_trigger on invoice_payment_breakdowns;
create constraint trigger invoice_payment_breakdown_total_trigger
after insert or update of invoice_id, amount on invoice_payment_breakdowns
deferrable initially deferred
for each row
execute function validate_invoice_payment_breakdown_total();
