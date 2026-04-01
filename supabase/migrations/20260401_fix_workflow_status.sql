-- Fix workflow_status check constraint to match actual values used in the code
ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_workflow_status_check;

ALTER TABLE social_posts 
ADD CONSTRAINT social_posts_workflow_status_check 
CHECK (workflow_status IN ('captions', 'creatives_approval', 'final_approval', 'for_publishing', 'published'));

-- Update any old values to new format
UPDATE social_posts SET workflow_status = 'captions' WHERE workflow_status = 'new';
UPDATE social_posts SET workflow_status = 'final_approval' WHERE workflow_status = 'client_approval';
UPDATE social_posts SET workflow_status = 'published' WHERE workflow_status IN ('approved', 'posted');
