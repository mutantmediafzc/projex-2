-- ============================================
-- MOTION: Task Management System (Notion-style)
-- ============================================

-- Motion task status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'motion_task_status') then
    create type motion_task_status as enum (
      'backlog',
      'todo',
      'in_progress',
      'in_review',
      'completed',
      'blocked',
      'cancelled'
    );
  end if;
end
$$;

-- Motion task priority enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'motion_task_priority') then
    create type motion_task_priority as enum (
      'none',
      'low',
      'medium',
      'high',
      'urgent'
    );
  end if;
end
$$;

-- Motion labels for categorization
create table if not exists motion_labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6366f1',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

create unique index if not exists motion_labels_name_key on motion_labels(name);

-- Motion workspaces/projects (optional grouping)
create table if not exists motion_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text default '#8b5cf6',
  icon text default '📁',
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Motion tasks - main table
create table if not exists motion_tasks (
  id uuid primary key default gen_random_uuid(),
  task_number serial,
  task_id text generated always as ('MTN-' || task_number) stored,
  workspace_id uuid references motion_workspaces(id) on delete set null,
  parent_task_id uuid references motion_tasks(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  
  -- Core fields
  title text not null,
  description text,
  status text check (status in ('backlog', 'todo', 'in_progress', 'in_review', 'completed', 'blocked', 'cancelled')) default 'todo',
  priority text check (priority in ('none', 'low', 'medium', 'high', 'urgent')) default 'medium',
  
  -- Dates
  due_date timestamptz,
  start_date timestamptz,
  completed_at timestamptz,
  
  -- Estimation
  estimated_hours numeric(6, 2),
  actual_hours numeric(6, 2),
  
  -- Assignment
  assignee_id uuid references users(id) on delete set null,
  assignee_name text,
  
  -- Creator
  created_by_id uuid references users(id) on delete set null,
  created_by_name text,
  
  -- Metadata
  sort_order int default 0,
  is_archived boolean default false,
  archived_at timestamptz,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists motion_tasks_workspace_id_idx on motion_tasks(workspace_id);
create index if not exists motion_tasks_parent_task_id_idx on motion_tasks(parent_task_id);
create index if not exists motion_tasks_project_id_idx on motion_tasks(project_id);
create index if not exists motion_tasks_assignee_id_idx on motion_tasks(assignee_id);
create index if not exists motion_tasks_status_idx on motion_tasks(status);
create index if not exists motion_tasks_due_date_idx on motion_tasks(due_date);
create index if not exists motion_tasks_created_at_idx on motion_tasks(created_at);

-- Motion task labels (many-to-many)
create table if not exists motion_task_labels (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references motion_tasks(id) on delete cascade,
  label_id uuid not null references motion_labels(id) on delete cascade,
  created_at timestamptz default now()
);

create unique index if not exists motion_task_labels_unique on motion_task_labels(task_id, label_id);

-- Motion checklist items (sub-tasks)
create table if not exists motion_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references motion_tasks(id) on delete cascade,
  title text not null,
  is_completed boolean default false,
  completed_at timestamptz,
  completed_by uuid references users(id) on delete set null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists motion_checklist_items_task_id_idx on motion_checklist_items(task_id);

-- Motion task comments
create table if not exists motion_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references motion_tasks(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  author_name text,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists motion_task_comments_task_id_idx on motion_task_comments(task_id);

-- Motion comment mentions
create table if not exists motion_comment_mentions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references motion_task_comments(id) on delete cascade,
  task_id uuid not null references motion_tasks(id) on delete cascade,
  mentioned_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists motion_comment_mentions_user_idx on motion_comment_mentions(mentioned_user_id, read_at);

-- Motion task activity log
create table if not exists motion_task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references motion_tasks(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  user_name text,
  action text not null,
  field_name text,
  old_value text,
  new_value text,
  created_at timestamptz default now()
);

create index if not exists motion_task_activity_task_id_idx on motion_task_activity(task_id);

-- Motion saved views/filters
create table if not exists motion_saved_views (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  view_type text check (view_type in ('list', 'kanban', 'calendar', 'timeline')) default 'list',
  filters jsonb default '{}'::jsonb,
  sort_config jsonb default '{}'::jsonb,
  group_by text,
  is_default boolean default false,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed some default labels
insert into motion_labels (name, color) values
  ('Bug', '#ef4444'),
  ('Feature', '#22c55e'),
  ('Enhancement', '#3b82f6'),
  ('Documentation', '#8b5cf6'),
  ('Design', '#ec4899'),
  ('Backend', '#f97316'),
  ('Frontend', '#06b6d4'),
  ('Urgent', '#dc2626')
on conflict (name) do nothing;
