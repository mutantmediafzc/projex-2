-- ============================================
-- IG GROWTH SYSTEM
-- Instagram growth management similar to Pathsocial
-- ============================================

-- Instagram accounts being managed for growth
CREATE TABLE IF NOT EXISTS ig_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  username text NOT NULL,
  profile_url text,
  profile_pic_url text,
  bio text,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0,
  niche text,
  status text CHECK (status IN ('active', 'paused', 'pending', 'inactive')) DEFAULT 'pending',
  plan_type text CHECK (plan_type IN ('core', 'elite')) DEFAULT 'core',
  target_followers_monthly integer DEFAULT 1500,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Targeting configuration for each account
CREATE TABLE IF NOT EXISTS ig_targeting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES ig_accounts(id) ON DELETE CASCADE,
  target_type text CHECK (target_type IN ('hashtag', 'similar_account', 'location', 'interest')) NOT NULL,
  target_value text NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Daily growth metrics tracking
CREATE TABLE IF NOT EXISTS ig_growth_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES ig_accounts(id) ON DELETE CASCADE,
  date date NOT NULL,
  followers_gained integer DEFAULT 0,
  followers_lost integer DEFAULT 0,
  net_followers integer DEFAULT 0,
  engagement_count integer DEFAULT 0,
  profile_visits integer DEFAULT 0,
  reach integer DEFAULT 0,
  impressions integer DEFAULT 0,
  website_clicks integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, date)
);

-- New followers tracking (where they came from)
CREATE TABLE IF NOT EXISTS ig_follower_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES ig_accounts(id) ON DELETE CASCADE,
  date date NOT NULL,
  source_type text CHECK (source_type IN ('hashtag', 'explore', 'profile', 'reels', 'stories', 'direct', 'other')) NOT NULL,
  source_value text,
  follower_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Growth campaigns
CREATE TABLE IF NOT EXISTS ig_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES ig_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  target_followers integer DEFAULT 1000,
  achieved_followers integer DEFAULT 0,
  status text CHECK (status IN ('draft', 'active', 'paused', 'completed')) DEFAULT 'draft',
  budget numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- AI profile analysis results
CREATE TABLE IF NOT EXISTS ig_profile_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES ig_accounts(id) ON DELETE CASCADE,
  analysis_date timestamptz DEFAULT now(),
  content_score integer,
  engagement_score integer,
  consistency_score integer,
  hashtag_effectiveness integer,
  best_posting_times jsonb,
  top_performing_content jsonb,
  recommendations jsonb,
  competitor_analysis jsonb
);

-- Activity log
CREATE TABLE IF NOT EXISTS ig_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES ig_accounts(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ig_accounts_company_idx ON ig_accounts(company_id);
CREATE INDEX IF NOT EXISTS ig_accounts_status_idx ON ig_accounts(status);
CREATE INDEX IF NOT EXISTS ig_targeting_account_idx ON ig_targeting(account_id);
CREATE INDEX IF NOT EXISTS ig_growth_metrics_account_date_idx ON ig_growth_metrics(account_id, date);
CREATE INDEX IF NOT EXISTS ig_campaigns_account_idx ON ig_campaigns(account_id);
CREATE INDEX IF NOT EXISTS ig_follower_sources_account_date_idx ON ig_follower_sources(account_id, date);

-- Enable RLS
ALTER TABLE ig_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_targeting ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_follower_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_profile_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users)
CREATE POLICY "Allow authenticated access to ig_accounts" ON ig_accounts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to ig_targeting" ON ig_targeting FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to ig_growth_metrics" ON ig_growth_metrics FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to ig_follower_sources" ON ig_follower_sources FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to ig_campaigns" ON ig_campaigns FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to ig_profile_analysis" ON ig_profile_analysis FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access to ig_activity_log" ON ig_activity_log FOR ALL USING (auth.role() = 'authenticated');
