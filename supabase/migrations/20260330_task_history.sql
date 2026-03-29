-- Task history/audit log table
CREATE TABLE IF NOT EXISTS task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('created', 'updated', 'status_changed', 'checklist_added', 'checklist_updated', 'checklist_deleted', 'checklist_toggled', 'comment_added')),
  field_name text,
  old_value text,
  new_value text,
  changed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_by_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_history_task_id_idx ON task_history(task_id);
CREATE INDEX IF NOT EXISTS task_history_created_at_idx ON task_history(created_at DESC);

-- Enable RLS
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_history
DROP POLICY IF EXISTS "Users can view task history" ON task_history;
DROP POLICY IF EXISTS "Users can create task history" ON task_history;

CREATE POLICY "Users can view task history" ON task_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create task history" ON task_history
  FOR INSERT TO authenticated WITH CHECK (true);
