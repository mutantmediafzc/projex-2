-- Create email_campaigns table for Email & WhatsApp campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES social_projects(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('email', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'not_due' CHECK (status IN ('not_due', 'in_progress', 'scheduled', 'published')),
  scheduled_date DATE,
  title TEXT NOT NULL,
  image_url TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by project
CREATE INDEX IF NOT EXISTS idx_email_campaigns_project_id ON email_campaigns(project_id);

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);

-- Create index for filtering by campaign type
CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(campaign_type);

-- Enable RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all for authenticated users" ON email_campaigns
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
