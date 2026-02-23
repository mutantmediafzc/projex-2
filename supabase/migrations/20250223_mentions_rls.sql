-- Enable RLS on mention tables and add policies for users to update their own read_at

-- project_note_mentions
alter table project_note_mentions enable row level security;

create policy "Users can view their own mentions"
  on project_note_mentions for select
  using (auth.uid() = mentioned_user_id);

create policy "Users can update read_at on their own mentions"
  on project_note_mentions for update
  using (auth.uid() = mentioned_user_id)
  with check (auth.uid() = mentioned_user_id);

-- task_comment_mentions
alter table task_comment_mentions enable row level security;

create policy "Users can view their own task comment mentions"
  on task_comment_mentions for select
  using (auth.uid() = mentioned_user_id);

create policy "Users can update read_at on their own task comment mentions"
  on task_comment_mentions for update
  using (auth.uid() = mentioned_user_id)
  with check (auth.uid() = mentioned_user_id);

-- workflow_step_mentions (create table if not exists)
create table if not exists workflow_step_mentions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  step_id text not null,
  mentioned_user_id uuid not null references users(id) on delete cascade,
  comment_body text,
  author_name text,
  created_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists workflow_step_mentions_recipient_idx
  on workflow_step_mentions(mentioned_user_id, read_at);

alter table workflow_step_mentions enable row level security;

create policy "Users can view their own workflow step mentions"
  on workflow_step_mentions for select
  using (auth.uid() = mentioned_user_id);

create policy "Users can update read_at on their own workflow step mentions"
  on workflow_step_mentions for update
  using (auth.uid() = mentioned_user_id)
  with check (auth.uid() = mentioned_user_id);

-- Allow authenticated users to insert mentions (for when creating comments)
create policy "Authenticated users can insert project note mentions"
  on project_note_mentions for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can insert task comment mentions"
  on task_comment_mentions for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can insert workflow step mentions"
  on workflow_step_mentions for insert
  with check (auth.role() = 'authenticated');
