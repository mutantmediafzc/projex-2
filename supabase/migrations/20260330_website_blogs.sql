-- Create website_blogs table for Blogs & Articles
CREATE TABLE IF NOT EXISTS website_blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES social_projects(id) ON DELETE CASCADE,
  publication_type TEXT NOT NULL CHECK (publication_type IN ('website_blog', 'linkedin_article')),
  status TEXT NOT NULL DEFAULT 'not_due' CHECK (status IN ('not_due', 'in_progress', 'scheduled', 'published')),
  scheduled_date DATE,
  title TEXT NOT NULL,
  image_url TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by project
CREATE INDEX IF NOT EXISTS idx_website_blogs_project_id ON website_blogs(project_id);

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_website_blogs_status ON website_blogs(status);

-- Create index for filtering by publication type
CREATE INDEX IF NOT EXISTS idx_website_blogs_type ON website_blogs(publication_type);

-- Enable RLS
ALTER TABLE website_blogs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all for authenticated users" ON website_blogs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
