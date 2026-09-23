-- Add an assignable Production & Traffic Coordinator role to Integrated Marketing projects.
ALTER TABLE social_projects
ADD COLUMN IF NOT EXISTS production_traffic_coordinator_ids uuid[];

CREATE INDEX IF NOT EXISTS idx_social_projects_ptc_ids
ON social_projects USING GIN (production_traffic_coordinator_ids);

COMMENT ON COLUMN social_projects.production_traffic_coordinator_ids IS
'Array of user IDs for production and traffic coordinators';
