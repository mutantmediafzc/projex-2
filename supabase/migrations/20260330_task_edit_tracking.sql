-- Add updated_by tracking fields to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by_name text;

-- Create index for updated_by queries
CREATE INDEX IF NOT EXISTS tasks_updated_by_user_id_idx ON tasks(updated_by_user_id);

-- Enable RLS on tasks table if not already enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON tasks;

-- Create RLS policies for tasks - allow all authenticated users to CRUD
CREATE POLICY "Users can view tasks" ON tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update tasks" ON tasks
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete tasks" ON tasks
  FOR DELETE TO authenticated USING (true);

-- Also ensure task_checklist_items has proper RLS
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view checklist items" ON task_checklist_items;
DROP POLICY IF EXISTS "Users can manage checklist items" ON task_checklist_items;

CREATE POLICY "Users can view checklist items" ON task_checklist_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage checklist items" ON task_checklist_items
  FOR ALL TO authenticated USING (true);

-- Ensure task_comments has proper RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view task comments" ON task_comments;
DROP POLICY IF EXISTS "Users can create task comments" ON task_comments;

CREATE POLICY "Users can view task comments" ON task_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create task comments" ON task_comments
  FOR INSERT TO authenticated WITH CHECK (true);
