begin;

-- Keep manually configured retainer/project accounts distinct from the
-- automatically provisioned account that every company receives.
alter table public.account_clients
  drop constraint if exists account_clients_client_category_check;

alter table public.account_clients
  add constraint account_clients_client_category_check
  check (client_category in ('active_retainer', 'project_based', 'company'));

-- A company can have only one account. PostgreSQL still permits rows with a
-- null company_id, which preserves compatibility with legacy manual records.
create unique index if not exists account_clients_company_id_unique_idx
  on public.account_clients (company_id)
  where company_id is not null;

insert into public.account_clients (
  company_id,
  client_name,
  industry,
  avatar_url,
  client_type,
  client_category,
  services_signed,
  retainer_fee,
  service_based_fee,
  adhoc_fee,
  currency
)
select
  company.id,
  company.name,
  company.industry,
  company.logo_url,
  'standard',
  'company',
  '[]'::jsonb,
  0,
  0,
  0,
  'AED'
from public.companies as company
where not exists (
  select 1
  from public.account_clients as account
  where account.company_id = company.id
);

-- Associate every account with all projects belonging to its company. These
-- links support account documents and provide the same company boundary used
-- by the live Statement of Account invoice query.
insert into public.account_client_projects (account_client_id, project_id)
select account.id, project.id
from public.account_clients as account
join public.projects as project
  on project.company_id = account.company_id
on conflict (account_client_id, project_id) do nothing;

commit;
