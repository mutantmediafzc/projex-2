create table if not exists financial_expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('Visa Expenses', 'Office Grocery', 'Office Equipment', 'Commission', 'DEWA', 'DU', 'Office Internet', 'Others')),
  other_type text,
  price numeric(12, 2) not null check (price >= 0),
  includes_vat boolean not null default false,
  vat_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null check (total >= 0),
  expense_date date not null default current_date,
  status text not null check (status in ('pending', 'requested', 'paid', 'rejected')) default 'pending',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists financial_expenses_date_idx on financial_expenses(expense_date desc);
create index if not exists financial_expenses_status_idx on financial_expenses(status);
create index if not exists financial_expenses_type_idx on financial_expenses(type);
