-- ============================================
-- CREATE PROJECT SUBSCRIPTIONS TABLE
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS project_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES social_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  subscription_month INTEGER NOT NULL CHECK (subscription_month >= 1 AND subscription_month <= 12),
  subscription_year INTEGER NOT NULL CHECK (subscription_year >= 2020 AND subscription_year <= 2100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_subscriptions_project_id ON project_subscriptions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_subscriptions_year_month ON project_subscriptions(subscription_year, subscription_month);

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
