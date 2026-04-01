-- ============================================
-- CREATE PROJECT SUBSCRIPTIONS TABLE
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS project_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES social_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  start_month INTEGER NOT NULL CHECK (start_month >= 1 AND start_month <= 12),
  start_year INTEGER NOT NULL CHECK (start_year >= 2020 AND start_year <= 2100),
  end_month INTEGER NOT NULL CHECK (end_month >= 1 AND end_month <= 12),
  end_year INTEGER NOT NULL CHECK (end_year >= 2020 AND end_year <= 2100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_subscriptions_project_id ON project_subscriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_subscriptions_start ON project_subscriptions(start_year, start_month);
CREATE INDEX IF NOT EXISTS idx_project_subscriptions_end ON project_subscriptions(end_year, end_month);

-- Enable RLS
ALTER TABLE project_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read subscriptions
CREATE POLICY "Authenticated users can read subscriptions"
ON project_subscriptions FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert subscriptions
CREATE POLICY "Authenticated users can insert subscriptions"
ON project_subscriptions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update subscriptions
CREATE POLICY "Authenticated users can update subscriptions"
ON project_subscriptions FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete subscriptions
CREATE POLICY "Authenticated users can delete subscriptions"
ON project_subscriptions FOR DELETE
TO authenticated
USING (true);
