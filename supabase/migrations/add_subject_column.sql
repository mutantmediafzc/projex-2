-- Add subject column to social_posts table
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS subject TEXT;

-- Update workflow_status values from old to new format
UPDATE social_posts SET workflow_status = 'captions' WHERE workflow_status = 'new';
UPDATE social_posts SET workflow_status = 'final_approval' WHERE workflow_status = 'client_approval';
UPDATE social_posts SET workflow_status = 'for_publishing' WHERE workflow_status = 'approved';
UPDATE social_posts SET workflow_status = 'published' WHERE workflow_status = 'posted';
