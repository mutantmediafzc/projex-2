-- ============================================
-- SOCIAL PROJECT TEAM ASSIGNMENTS
-- Add team member assignment fields to social_projects
-- for notification routing based on workflow status
-- ============================================

-- Add team assignment columns to social_projects table
ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS account_manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS creative_team_lead_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS creative_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS social_media_specialist_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS performance_marketer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS social_projects_account_manager_idx ON social_projects(account_manager_id);
CREATE INDEX IF NOT EXISTS social_projects_creative_team_lead_idx ON social_projects(creative_team_lead_id);
CREATE INDEX IF NOT EXISTS social_projects_creative_idx ON social_projects(creative_id);
CREATE INDEX IF NOT EXISTS social_projects_social_media_specialist_idx ON social_projects(social_media_specialist_id);
CREATE INDEX IF NOT EXISTS social_projects_performance_marketer_idx ON social_projects(performance_marketer_id);

-- Update workflow_status constraint to include all current values
ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_workflow_status_check;
ALTER TABLE social_posts 
ADD CONSTRAINT social_posts_workflow_status_check 
CHECK (workflow_status IN ('captions', 'creatives_approval', 'final_approval', 'for_publishing', 'published'));

-- Add notification_sent flag to track if notifications were already sent for a status
ALTER TABLE social_posts
ADD COLUMN IF NOT EXISTS last_notification_status text;

-- Comments for documentation
COMMENT ON COLUMN social_projects.account_manager_id IS 'User responsible for account management';
COMMENT ON COLUMN social_projects.creative_team_lead_id IS 'User leading the creative team';
COMMENT ON COLUMN social_projects.creative_id IS 'Creative team member assigned to this project';
COMMENT ON COLUMN social_projects.social_media_specialist_id IS 'Social media specialist for this project';
COMMENT ON COLUMN social_projects.performance_marketer_id IS 'Performance marketer for boosted content';
