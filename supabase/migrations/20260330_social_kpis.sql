-- Social KPIs table for comprehensive KPI tracking linked to strategies
CREATE TABLE IF NOT EXISTS social_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES social_projects(id) ON DELETE CASCADE,
  strategy_id uuid REFERENCES social_strategy_links(id) ON DELETE SET NULL,
  report_period text NOT NULL, -- e.g., "2026-Q2" or "2026-03"
  
  -- Social Media Content (Number fields)
  sm_reels integer DEFAULT 0,
  sm_long_form_video integer DEFAULT 0,
  sm_static_carousels integer DEFAULT 0,
  sm_stories integer DEFAULT 0,
  
  -- Social Media KPIs (actual/goal pairs)
  sm_impressions_kpi text,
  sm_impressions_goal integer DEFAULT 0,
  sm_reach_kpi text,
  sm_reach_goal integer DEFAULT 0,
  sm_engagement_kpi text,
  sm_engagement_goal integer DEFAULT 0,
  sm_followers_kpi text,
  sm_followers_goal integer DEFAULT 0,
  sm_clicks_kpi text,
  sm_clicks_goal integer DEFAULT 0,
  
  -- Email & WhatsApp Marketing Campaigns (Number fields)
  email_campaigns integer DEFAULT 0,
  whatsapp_campaigns integer DEFAULT 0,
  
  -- Email & WhatsApp KPIs
  ewm_ctr_kpi text,
  ewm_ctr_goal integer DEFAULT 0,
  
  -- SEO & AEO Content (Number fields)
  seo_website_blogs integer DEFAULT 0,
  seo_linkedin_articles integer DEFAULT 0,
  seo_pr_offpage integer DEFAULT 0,
  
  -- SEO & AEO KPIs
  seo_impressions_kpi text,
  seo_impressions_goal integer DEFAULT 0,
  
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_kpis_project_id_idx ON social_kpis(project_id);
CREATE INDEX IF NOT EXISTS social_kpis_strategy_id_idx ON social_kpis(strategy_id);
CREATE INDEX IF NOT EXISTS social_kpis_report_period_idx ON social_kpis(report_period);

-- Enable RLS
ALTER TABLE social_kpis ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view social_kpis" ON social_kpis;
DROP POLICY IF EXISTS "Users can manage social_kpis" ON social_kpis;

CREATE POLICY "Users can view social_kpis" ON social_kpis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage social_kpis" ON social_kpis
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
