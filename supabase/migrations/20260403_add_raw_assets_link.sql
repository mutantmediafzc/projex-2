-- Add raw_assets_link column to social_posts table
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS raw_assets_link TEXT;

-- Update workflow_status check constraint to include creative_approval
ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_workflow_status_check;
ALTER TABLE social_posts 
ADD CONSTRAINT social_posts_workflow_status_check 
CHECK (workflow_status IN ('captions', 'creatives_approval', 'creative_approval', 'final_approval', 'for_publishing', 'published'));
