-- Add 'social_workflow' as a valid source for tasks
-- This allows social media workflow notifications to be stored as tasks

-- Drop the existing constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_source_check;

-- Add new constraint with social_workflow option
ALTER TABLE tasks ADD CONSTRAINT tasks_source_check 
  CHECK (source IN ('operations', 'admin', 'social_workflow'));
