-- Ensure the quarterly reports table exists in environments where the
-- original quarterly reports migration was not applied.
CREATE TABLE IF NOT EXISTS social_quarterly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES social_projects(id) ON DELETE CASCADE,
  report_quarter text NOT NULL,
  quarter_start_date date NOT NULL,
  quarter_end_date date NOT NULL,
  monthly_data jsonb DEFAULT '[]'::jsonb,
  platform_metrics jsonb DEFAULT '{}'::jsonb,
  previous_quarter_comparison jsonb DEFAULT '{}'::jsonb,
  boosted_summary jsonb DEFAULT '{}'::jsonb,
  content_data jsonb DEFAULT '[]'::jsonb,
  objectives_text text,
  core_goals text,
  theme_text text,
  content_pillars jsonb DEFAULT '[]'::jsonb,
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
