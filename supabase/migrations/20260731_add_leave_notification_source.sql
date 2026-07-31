-- Leave events use the existing tasks inbox so they participate in unread counts.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_source_check;

ALTER TABLE tasks ADD CONSTRAINT tasks_source_check
  CHECK (source IN ('operations', 'admin', 'social_workflow', 'leave'));
