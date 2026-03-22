-- Update project_type constraint to allow new project types
-- Drop the old constraint first
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;

-- Add the new constraint with all project types
ALTER TABLE projects ADD CONSTRAINT projects_project_type_check 
  CHECK (project_type IN (
    'social_media_seo',
    'app_design', 
    'brand_development',
    'content_creation',
    'digital_marketing',
    'event_services',
    'studio_rental',
    'technical_assistance',
    'web_design',
    -- Keep old values for backward compatibility during migration
    'social_media',
    'website', 
    'branding'
  ));

-- Migrate old values to new values
UPDATE projects SET project_type = 'social_media_seo' WHERE project_type = 'social_media';
UPDATE projects SET project_type = 'web_design' WHERE project_type = 'website';
UPDATE projects SET project_type = 'brand_development' WHERE project_type = 'branding';
