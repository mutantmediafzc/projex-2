-- Migration: Update project statuses
-- Date: 2026-03-23
-- Changes:
--   - "completed" → "Project Delivered"
--   - "in_progress" → "Project Ongoing"
--   - "Project Started" → "Project Ongoing"
--   - Remove "cancelled" status (set to "Project Lost")

-- Update completed to Project Delivered
UPDATE projects SET status = 'Project Delivered' WHERE status = 'completed';

-- Update in_progress to Project Ongoing
UPDATE projects SET status = 'Project Ongoing' WHERE status = 'in_progress';

-- Update Project Started to Project Ongoing
UPDATE projects SET status = 'Project Ongoing' WHERE status = 'Project Started';

-- Update cancelled to Project Lost
UPDATE projects SET status = 'Project Lost' WHERE status = 'cancelled';
