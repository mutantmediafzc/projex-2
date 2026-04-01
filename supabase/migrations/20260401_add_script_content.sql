-- Add script_content column to social_posts table
ALTER TABLE social_posts 
ADD COLUMN IF NOT EXISTS script_content text;

-- Add comment for documentation
COMMENT ON COLUMN social_posts.script_content IS 'Script content for the social media post';
