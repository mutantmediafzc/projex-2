-- Brand Briefing Form submissions
-- Stores form submissions posted from external marketing sites to
-- /api/brand-briefing-form-fetch. Nested sections are stored as JSONB
-- since their shape may evolve without requiring a migration.

CREATE TABLE IF NOT EXISTS brand_briefing_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  company TEXT,

  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_country_code TEXT,
  mobile TEXT,
  mobile_with_country_code TEXT,

  brand_brief JSONB NOT NULL DEFAULT '{}',
  objectives JSONB NOT NULL DEFAULT '{}',
  challenges JSONB NOT NULL DEFAULT '{}',
  current_marketing_activities JSONB NOT NULL DEFAULT '{}',
  goals JSONB NOT NULL DEFAULT '{}',
  service_requirements JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',

  raw_payload JSONB NOT NULL DEFAULT '{}',
  source_ip TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_briefing_form_submissions_created_at
  ON brand_briefing_form_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brand_briefing_form_submissions_email
  ON brand_briefing_form_submissions (email);

ALTER TABLE brand_briefing_form_submissions ENABLE ROW LEVEL SECURITY;

-- All access goes through the API routes using the Supabase service role
-- key, so no anon/authenticated policies are needed here.
