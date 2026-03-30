-- Add new team assignment columns to social_projects table
ALTER TABLE social_projects
ADD COLUMN IF NOT EXISTS email_whatsapp_specialist_id uuid REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS website_blogs_specialist_id uuid REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS content_creator_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN social_projects.email_whatsapp_specialist_id IS 'User assigned to handle email and WhatsApp campaigns';
COMMENT ON COLUMN social_projects.website_blogs_specialist_id IS 'User assigned to manage website blog content';
COMMENT ON COLUMN social_projects.content_creator_id IS 'User assigned as content creator for all platforms';
