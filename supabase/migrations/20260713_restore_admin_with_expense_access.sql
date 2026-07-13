-- Expense access is additive: retain admin module access and limit only the
-- Financials screen to expenses for these users.
update public.users
set role = 'admin'
where upper(split_part(trim(coalesce(full_name, '')), ' ', 1)) in
  ('JEANO', 'SHEENA', 'CARLO', 'MAJD', 'WILSON')
  and role = 'expense';

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin', 'expense_access', true)
where upper(coalesce(raw_user_meta_data ->> 'first_name', split_part(trim(coalesce(raw_user_meta_data ->> 'full_name', '')), ' ', 1))) in
  ('JEANO', 'SHEENA', 'CARLO', 'MAJD', 'WILSON');
