begin;

do $$
begin
  if to_regclass('backup_invoice_import_20260709.invoices') is null
    or to_regclass('backup_invoice_import_20260709.invoice_items') is null
    or to_regclass('backup_invoice_import_20260709.invoice_payments') is null then
    raise exception 'The backup_invoice_import_20260709 backup tables are incomplete';
  end if;
end $$;

create schema if not exists backup_invoice_restore_20260714;

create table backup_invoice_restore_20260714.invoices_before_restore
  as table public.invoices;
create table backup_invoice_restore_20260714.invoice_items_before_restore
  as table public.invoice_items;
create table backup_invoice_restore_20260714.invoice_payments_before_restore
  as table public.invoice_payments;

truncate table
  public.invoice_payments,
  public.invoice_items,
  public.invoices;

do $$
declare
  target_table_name text;
  shared_columns text;
begin
  foreach target_table_name in array array['invoices', 'invoice_items', 'invoice_payments']
  loop
    select string_agg(format('%I', live.column_name), ', ' order by live.ordinal_position)
      into shared_columns
    from information_schema.columns live
    where live.table_schema = 'public'
      and live.table_name = target_table_name
      and exists (
        select 1
        from information_schema.columns backup
        where backup.table_schema = 'backup_invoice_import_20260709'
          and backup.table_name = target_table_name
          and backup.column_name = live.column_name
      );

    if shared_columns is null then
      raise exception 'No shared columns found for table %', target_table_name;
    end if;

    execute format(
      'insert into public.%I (%s) select %s from backup_invoice_import_20260709.%I',
      target_table_name,
      shared_columns,
      shared_columns,
      target_table_name
    );
  end loop;
end $$;

commit;

select 'invoices' as table_name, count(*) as restored_rows from public.invoices
union all
select 'invoice_items', count(*) from public.invoice_items
union all
select 'invoice_payments', count(*) from public.invoice_payments;
