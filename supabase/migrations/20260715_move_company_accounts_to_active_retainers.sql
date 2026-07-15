begin;

update public.account_clients
set client_category = 'active_retainer',
    updated_at = now()
where client_category = 'company';

alter table public.account_clients
  drop constraint if exists account_clients_client_category_check;

alter table public.account_clients
  add constraint account_clients_client_category_check
  check (client_category in ('active_retainer', 'project_based'));

commit;
