alter table if exists invoice_payment_breakdowns
  add column if not exists generated_invoice_id uuid references invoices(id) on delete set null;

create unique index if not exists invoice_payment_breakdowns_generated_invoice_id_idx
  on invoice_payment_breakdowns(generated_invoice_id)
  where generated_invoice_id is not null;
