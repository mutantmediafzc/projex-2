-- ============================================
-- SEO PROJECTS AND GOALS MANAGEMENT
-- Tables for SEO/AEO project tracking and goal setting
-- ============================================

-- SEO Projects table (linked to companies)
CREATE TABLE IF NOT EXISTS seo_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  domain text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  project_type text DEFAULT 'seo' CHECK (project_type IN ('seo', 'aeo', 'both')),
  semrush_project_id text,
  target_keywords text[],
  competitors text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- SEO Goals table
CREATE TABLE IF NOT EXISTS seo_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES seo_projects(id) ON DELETE CASCADE,
  goal_type text NOT NULL CHECK (goal_type IN ('organic_traffic', 'keyword_ranking', 'backlinks', 'domain_authority', 'page_speed', 'indexed_pages', 'conversion_rate', 'bounce_rate', 'aeo_visibility', 'featured_snippets', 'custom')),
  title text NOT NULL,
  description text,
  target_value numeric NOT NULL,
  current_value numeric DEFAULT 0,
  unit text DEFAULT 'count',
  start_date date DEFAULT CURRENT_DATE,
  target_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'missed', 'paused')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- SEO Goal Progress tracking (for historical data)
CREATE TABLE IF NOT EXISTS seo_goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES seo_goals(id) ON DELETE CASCADE,
  recorded_value numeric NOT NULL,
  recorded_at timestamptz DEFAULT now(),
  notes text
);

-- SEO Keywords tracking
CREATE TABLE IF NOT EXISTS seo_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES seo_projects(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  search_volume integer,
  keyword_difficulty numeric,
  current_position integer,
  previous_position integer,
  target_position integer DEFAULT 10,
  cpc numeric,
  trend text,
  is_tracked boolean DEFAULT true,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- SEO Content Suggestions (AI generated)
CREATE TABLE IF NOT EXISTS seo_content_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES seo_projects(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL CHECK (suggestion_type IN ('blog_topic', 'keyword_opportunity', 'content_gap', 'trending_topic', 'aeo_question', 'optimization_tip')),
  title text NOT NULL,
  description text,
  keywords text[],
  priority_score integer DEFAULT 50,
  source text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'accepted', 'rejected', 'implemented')),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- SEO Audit Results
CREATE TABLE IF NOT EXISTS seo_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES seo_projects(id) ON DELETE CASCADE,
  audit_type text NOT NULL CHECK (audit_type IN ('full', 'technical', 'content', 'backlinks', 'speed')),
  score integer,
  issues_count integer DEFAULT 0,
  warnings_count integer DEFAULT 0,
  passed_count integer DEFAULT 0,
  audit_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_seo_projects_company ON seo_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_projects_status ON seo_projects(status);
CREATE INDEX IF NOT EXISTS idx_seo_goals_project ON seo_goals(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_goals_status ON seo_goals(status);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_project ON seo_keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_keyword ON seo_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_suggestions_project ON seo_content_suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_audits_project ON seo_audits(project_id);

-- Enable RLS
ALTER TABLE seo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Users can view SEO projects" ON seo_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert SEO projects" ON seo_projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update SEO projects" ON seo_projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete SEO projects" ON seo_projects FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view SEO goals" ON seo_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert SEO goals" ON seo_goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update SEO goals" ON seo_goals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete SEO goals" ON seo_goals FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view goal progress" ON seo_goal_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert goal progress" ON seo_goal_progress FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view SEO keywords" ON seo_keywords FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage SEO keywords" ON seo_keywords FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view content suggestions" ON seo_content_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage content suggestions" ON seo_content_suggestions FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view SEO audits" ON seo_audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert SEO audits" ON seo_audits FOR INSERT TO authenticated WITH CHECK (true);

-- Add comments
COMMENT ON TABLE seo_projects IS 'SEO and AEO projects linked to companies';
COMMENT ON TABLE seo_goals IS 'Dynamic goals for SEO/AEO projects with progress tracking';
COMMENT ON TABLE seo_keywords IS 'Tracked keywords with position and metrics data';
COMMENT ON TABLE seo_content_suggestions IS 'AI-generated content suggestions and trending topics';
