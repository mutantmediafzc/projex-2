-- NULL preserves the invoice-wide tax calculation for existing/imported items.
-- New invoice forms explicitly save 5 for taxable items and 0 for exempt items.
alter table public.invoice_items
  add column if not exists tax_rate numeric(5,2)
  check (tax_rate >= 0 and tax_rate <= 100);

comment on column public.invoice_items.tax_rate is
  'Item VAT percentage; NULL uses the legacy invoice-level tax rate.';
