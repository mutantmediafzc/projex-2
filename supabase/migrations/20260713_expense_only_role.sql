-- Expense-only access for the named finance users.
-- Keep both public.users and auth metadata aligned because the application supports
-- either source when resolving a user's role.
update public.users
set role = 'expense'
where upper(split_part(trim(coalesce(full_name, '')), ' ', 1)) in
  ('JEANO', 'SHEENA', 'CARLO', 'MAJD', 'WILSON');

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'expense')
where upper(coalesce(raw_user_meta_data ->> 'first_name', split_part(trim(coalesce(raw_user_meta_data ->> 'full_name', '')), ' ', 1))) in
  ('JEANO', 'SHEENA', 'CARLO', 'MAJD', 'WILSON');
