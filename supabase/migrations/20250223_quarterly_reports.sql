-- Migration for Quarterly Reports System

-- Add report_platforms to social_projects to track which platforms to show in reports
ALTER TABLE social_projects 
ADD COLUMN IF NOT EXISTS report_platforms jsonb DEFAULT '[]'::jsonb;

-- Add platform_budgets column to social_posts if not exists
ALTER TABLE social_posts 
ADD COLUMN IF NOT EXISTS platform_budgets jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS post_type text DEFAULT 'organic' CHECK (post_type IN ('organic', 'boosted'));

-- Create quarterly reports table
CREATE TABLE IF NOT EXISTS social_quarterly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES social_projects(id) ON DELETE CASCADE,
  
  -- Quarter identification (e.g., '2025-Q1', '2025-Q2')
  report_quarter text NOT NULL,
  quarter_start_date date NOT NULL,
  quarter_end_date date NOT NULL,
  
  -- Monthly data for the quarter (3 months)
  monthly_data jsonb DEFAULT '[]'::jsonb, -- [{month: '2025-01', reach: X, views: Y, engagement: Z, followers: W}, ...]
  
  -- Platform-specific metrics
  platform_metrics jsonb DEFAULT '{}'::jsonb, -- { instagram: {reach, views, engagement, followers}, ... }
  
  -- Previous quarter comparison
  previous_quarter_comparison jsonb DEFAULT '{}'::jsonb, -- { reach: {current, previous, change}, ... }
  
  -- Boosted content summary by platform
  boosted_summary jsonb DEFAULT '{}'::jsonb, -- { instagram: {posts: N, total_spend: X}, ... }
  
  -- Content calendar data for the quarter
  content_data jsonb DEFAULT '[]'::jsonb, -- Array of posts with their details
  
  -- Objectives and notes (carried from project or custom)
  objectives_text text,
  core_goals text,
  theme_text text,
  content_pillars jsonb DEFAULT '[]'::jsonb,
  
  -- Public access
  public_link_token text UNIQUE,
  public_link_expires_at timestamptz,
  is_published boolean DEFAULT false,
  
  notes text,
  
  created_by_user_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_quarterly_reports_project_id_idx ON social_quarterly_reports(project_id);
CREATE INDEX IF NOT EXISTS social_quarterly_reports_quarter_idx ON social_quarterly_reports(report_quarter);
CREATE UNIQUE INDEX IF NOT EXISTS social_quarterly_reports_token_idx ON social_quarterly_reports(public_link_token) WHERE public_link_token IS NOT NULL;

-- Function to get quarter string from date
CREATE OR REPLACE FUNCTION get_quarter_string(d date) RETURNS text AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM d)::text || '-Q' || EXTRACT(QUARTER FROM d)::text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get quarter start date
CREATE OR REPLACE FUNCTION get_quarter_start(d date) RETURNS date AS $$
BEGIN
  RETURN date_trunc('quarter', d)::date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get quarter end date
CREATE OR REPLACE FUNCTION get_quarter_end(d date) RETURNS date AS $$
BEGIN
  RETURN (date_trunc('quarter', d) + interval '3 months' - interval '1 day')::date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
