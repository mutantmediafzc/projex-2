-- ============================================
-- MULTI-USER ROLE ASSIGNMENTS
-- Convert single UUID role columns to UUID arrays
-- to allow multiple people per role
-- ============================================

-- Helper function to convert single UUID to array (preserving existing data)
CREATE OR REPLACE FUNCTION uuid_to_array(val uuid) RETURNS uuid[] AS $$
BEGIN
  IF val IS NULL THEN
    RETURN NULL;
  ELSE
    RETURN ARRAY[val];
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Convert project_manager_id from uuid to uuid[]
ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS project_manager_ids uuid[];

UPDATE social_projects 
SET project_manager_ids = uuid_to_array(project_manager_id)
WHERE project_manager_id IS NOT NULL AND project_manager_ids IS NULL;

ALTER TABLE social_projects DROP COLUMN IF EXISTS project_manager_id;

-- Convert account_manager_id from uuid to uuid[]
ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS account_manager_ids uuid[];

UPDATE social_projects 
SET account_manager_ids = uuid_to_array(account_manager_id)
WHERE account_manager_id IS NOT NULL AND account_manager_ids IS NULL;

ALTER TABLE social_projects DROP COLUMN IF EXISTS account_manager_id;

-- Convert creative_team_lead_id from uuid to uuid[]
ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS creative_team_lead_ids uuid[];

UPDATE social_projects 
SET creative_team_lead_ids = uuid_to_array(creative_team_lead_id)
WHERE creative_team_lead_id IS NOT NULL AND creative_team_lead_ids IS NULL;

ALTER TABLE social_projects DROP COLUMN IF EXISTS creative_team_lead_id;

-- Convert creative_id from uuid to uuid[]
ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS creative_ids uuid[];

UPDATE social_projects 
SET creative_ids = uuid_to_array(creative_id)
WHERE creative_id IS NOT NULL AND creative_ids IS NULL;

ALTER TABLE social_projects DROP COLUMN IF EXISTS creative_id;

-- Convert videographer_id from uuid to uuid[]
ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS videographer_ids uuid[];

UPDATE social_projects 
SET videographer_ids = uuid_to_array(videographer_id)
WHERE videographer_id IS NOT NULL AND videographer_ids IS NULL;

ALTER TABLE social_projects DROP COLUMN IF EXISTS videographer_id;

-- Convert social_media_specialist_id from uuid to uuid[]
ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS social_media_specialist_ids uuid[];

UPDATE social_projects 
SET social_media_specialist_ids = uuid_to_array(social_media_specialist_id)
WHERE social_media_specialist_id IS NOT NULL AND social_media_specialist_ids IS NULL;

ALTER TABLE social_projects DROP COLUMN IF EXISTS social_media_specialist_id;

-- Convert performance_marketer_id from uuid to uuid[]
ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS performance_marketer_ids uuid[];

UPDATE social_projects 
SET performance_marketer_ids = uuid_to_array(performance_marketer_id)
WHERE performance_marketer_id IS NOT NULL AND performance_marketer_ids IS NULL;

ALTER TABLE social_projects DROP COLUMN IF EXISTS performance_marketer_id;

-- Convert email_whatsapp_specialist_id from uuid to uuid[]
ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS email_whatsapp_specialist_ids uuid[];

UPDATE social_projects 
SET email_whatsapp_specialist_ids = uuid_to_array(email_whatsapp_specialist_id)
WHERE email_whatsapp_specialist_id IS NOT NULL AND email_whatsapp_specialist_ids IS NULL;

ALTER TABLE social_projects DROP COLUMN IF EXISTS email_whatsapp_specialist_id;

-- Convert website_blogs_specialist_id from uuid to uuid[]
ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS website_blogs_specialist_ids uuid[];

UPDATE social_projects 
SET website_blogs_specialist_ids = uuid_to_array(website_blogs_specialist_id)
WHERE website_blogs_specialist_id IS NOT NULL AND website_blogs_specialist_ids IS NULL;

ALTER TABLE social_projects DROP COLUMN IF EXISTS website_blogs_specialist_id;

-- Convert content_creator_id from uuid to uuid[]
ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS content_creator_ids uuid[];

UPDATE social_projects 
SET content_creator_ids = uuid_to_array(content_creator_id)
WHERE content_creator_id IS NOT NULL AND content_creator_ids IS NULL;

ALTER TABLE social_projects DROP COLUMN IF EXISTS content_creator_id;

-- Create GIN indexes for efficient array containment queries
CREATE INDEX IF NOT EXISTS idx_social_projects_pm_ids ON social_projects USING GIN (project_manager_ids);
CREATE INDEX IF NOT EXISTS idx_social_projects_am_ids ON social_projects USING GIN (account_manager_ids);
CREATE INDEX IF NOT EXISTS idx_social_projects_ctl_ids ON social_projects USING GIN (creative_team_lead_ids);
CREATE INDEX IF NOT EXISTS idx_social_projects_creative_ids ON social_projects USING GIN (creative_ids);
CREATE INDEX IF NOT EXISTS idx_social_projects_video_ids ON social_projects USING GIN (videographer_ids);
CREATE INDEX IF NOT EXISTS idx_social_projects_sms_ids ON social_projects USING GIN (social_media_specialist_ids);
CREATE INDEX IF NOT EXISTS idx_social_projects_perf_ids ON social_projects USING GIN (performance_marketer_ids);
CREATE INDEX IF NOT EXISTS idx_social_projects_ewa_ids ON social_projects USING GIN (email_whatsapp_specialist_ids);
CREATE INDEX IF NOT EXISTS idx_social_projects_wbs_ids ON social_projects USING GIN (website_blogs_specialist_ids);
CREATE INDEX IF NOT EXISTS idx_social_projects_cc_ids ON social_projects USING GIN (content_creator_ids);

-- Drop old indexes
DROP INDEX IF EXISTS social_projects_account_manager_idx;
DROP INDEX IF EXISTS social_projects_creative_team_lead_idx;
DROP INDEX IF EXISTS social_projects_creative_idx;
DROP INDEX IF EXISTS social_projects_social_media_specialist_idx;
DROP INDEX IF EXISTS social_projects_performance_marketer_idx;

-- Clean up helper function
DROP FUNCTION IF EXISTS uuid_to_array(uuid);

-- Add comments
COMMENT ON COLUMN social_projects.project_manager_ids IS 'Array of user IDs for project managers';
COMMENT ON COLUMN social_projects.account_manager_ids IS 'Array of user IDs for account managers';
COMMENT ON COLUMN social_projects.creative_team_lead_ids IS 'Array of user IDs for creative team leads';
COMMENT ON COLUMN social_projects.creative_ids IS 'Array of user IDs for creatives';
COMMENT ON COLUMN social_projects.videographer_ids IS 'Array of user IDs for videographers';
COMMENT ON COLUMN social_projects.social_media_specialist_ids IS 'Array of user IDs for social media specialists';
COMMENT ON COLUMN social_projects.performance_marketer_ids IS 'Array of user IDs for performance marketers';
COMMENT ON COLUMN social_projects.email_whatsapp_specialist_ids IS 'Array of user IDs for email/whatsapp specialists';
COMMENT ON COLUMN social_projects.website_blogs_specialist_ids IS 'Array of user IDs for website/blog specialists';
COMMENT ON COLUMN social_projects.content_creator_ids IS 'Array of user IDs for content creators';
