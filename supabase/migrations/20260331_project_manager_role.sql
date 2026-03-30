-- Add project_manager_id column to social_projects table
ALTER TABLE social_projects
ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_social_projects_project_manager 
ON social_projects(project_manager_id);
