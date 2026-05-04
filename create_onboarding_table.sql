-- =====================================================
-- Onboarding Submissions Table
-- Run this in your Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public read/write (no auth needed — access controlled by slug/URL)
ALTER TABLE onboarding_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read onboarding" ON onboarding_submissions;
DROP POLICY IF EXISTS "Public write onboarding" ON onboarding_submissions;

CREATE POLICY "Public read onboarding"
  ON onboarding_submissions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public write onboarding"
  ON onboarding_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public update onboarding"
  ON onboarding_submissions FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);
