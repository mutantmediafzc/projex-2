-- =============================================
-- IG GROWTH HYBRID AGENCY MODEL
-- AI Targeting + Manual Engagement + Influencer Partnerships
-- =============================================

-- Engagement Tasks for Human Operators
CREATE TABLE IF NOT EXISTS ig_engagement_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES ig_accounts(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Task details
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN (
        'follow', 'like', 'comment', 'dm', 'story_view', 'story_reply', 'reel_engage'
    )),
    target_username VARCHAR(100) NOT NULL,
    target_profile_url TEXT,
    target_post_url TEXT,
    
    -- AI-generated guidance
    suggested_comment TEXT,
    suggested_dm TEXT,
    engagement_reason TEXT, -- Why this target was selected
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    
    -- Attribution
    resulted_in_follow BOOLEAN DEFAULT FALSE,
    resulted_in_engagement BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily task batches
CREATE TABLE IF NOT EXISTS ig_task_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES ig_accounts(id) ON DELETE CASCADE,
    batch_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Batch settings
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    follow_limit INTEGER DEFAULT 30,
    like_limit INTEGER DEFAULT 100,
    comment_limit INTEGER DEFAULT 30,
    dm_limit INTEGER DEFAULT 20,
    
    -- Generation source
    generated_by VARCHAR(50) DEFAULT 'ai', -- 'ai', 'manual', 'influencer'
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(account_id, batch_date)
);

-- Influencer Partnerships
CREATE TABLE IF NOT EXISTS ig_influencer_partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES ig_accounts(id) ON DELETE CASCADE,
    
    -- Influencer details
    influencer_username VARCHAR(100) NOT NULL,
    influencer_profile_url TEXT,
    influencer_followers INTEGER DEFAULT 0,
    influencer_niche VARCHAR(100),
    influencer_engagement_rate DECIMAL(5,2),
    
    -- Partnership details
    partnership_type VARCHAR(50) CHECK (partnership_type IN (
        'shoutout', 'story_mention', 'reel_collab', 'giveaway', 'takeover', 'ambassador'
    )),
    agreed_rate DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_time TIME,
    
    -- Results
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'negotiating', 'pending', 'scheduled', 'live', 'completed', 'cancelled'
    )),
    followers_gained INTEGER DEFAULT 0,
    reach_achieved INTEGER DEFAULT 0,
    engagement_achieved INTEGER DEFAULT 0,
    
    -- Evidence
    proof_url TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Target Suggestions (generated daily)
CREATE TABLE IF NOT EXISTS ig_ai_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES ig_accounts(id) ON DELETE CASCADE,
    
    -- Target details
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN (
        'user', 'hashtag', 'location', 'post', 'reel'
    )),
    target_value VARCHAR(255) NOT NULL,
    target_url TEXT,
    
    -- AI analysis
    relevance_score INTEGER CHECK (relevance_score BETWEEN 0 AND 100),
    audience_overlap_percent DECIMAL(5,2),
    engagement_potential VARCHAR(20) CHECK (engagement_potential IN ('low', 'medium', 'high', 'very_high')),
    reasoning TEXT,
    
    -- Metadata
    follower_count INTEGER,
    engagement_rate DECIMAL(5,2),
    post_frequency VARCHAR(20), -- 'daily', 'weekly', 'sporadic'
    last_active TIMESTAMPTZ,
    
    -- Usage tracking
    used_in_task BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Operator Performance Tracking
CREATE TABLE IF NOT EXISTS ig_operator_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES ig_accounts(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Daily metrics
    tasks_assigned INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_skipped INTEGER DEFAULT 0,
    
    -- Results
    follows_generated INTEGER DEFAULT 0,
    engagements_generated INTEGER DEFAULT 0,
    avg_response_time_minutes INTEGER,
    
    -- Quality score (calculated)
    quality_score DECIMAL(5,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(operator_id, account_id, stat_date)
);

-- Growth Attribution (link actions to results)
CREATE TABLE IF NOT EXISTS ig_growth_attribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES ig_accounts(id) ON DELETE CASCADE,
    
    -- Source of growth
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'organic', 'engagement_task', 'influencer', 'hashtag', 'reel', 'ad', 'unknown'
    )),
    source_id UUID, -- Reference to task, partnership, or campaign
    
    -- Growth details
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    followers_gained INTEGER DEFAULT 0,
    engagement_count INTEGER DEFAULT 0,
    
    -- Evidence
    evidence_type VARCHAR(50), -- 'direct_follow', 'profile_visit', 'content_share'
    evidence_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account operator assignments
CREATE TABLE IF NOT EXISTS ig_account_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES ig_accounts(id) ON DELETE CASCADE,
    operator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    role VARCHAR(50) DEFAULT 'operator' CHECK (role IN ('lead', 'operator', 'reviewer')),
    daily_task_quota INTEGER DEFAULT 50,
    
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(account_id, operator_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ig_tasks_account ON ig_engagement_tasks(account_id);
CREATE INDEX IF NOT EXISTS idx_ig_tasks_assigned ON ig_engagement_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_ig_tasks_status ON ig_engagement_tasks(status, created_at);
CREATE INDEX IF NOT EXISTS idx_ig_batches_account_date ON ig_task_batches(account_id, batch_date);
CREATE INDEX IF NOT EXISTS idx_ig_influencers_account ON ig_influencer_partnerships(account_id);
CREATE INDEX IF NOT EXISTS idx_ig_targets_account ON ig_ai_targets(account_id, used_in_task);
CREATE INDEX IF NOT EXISTS idx_ig_attribution_account ON ig_growth_attribution(account_id, date);
CREATE INDEX IF NOT EXISTS idx_ig_operators_account ON ig_account_operators(account_id, is_active);

-- Enable RLS
ALTER TABLE ig_engagement_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_task_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_influencer_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_ai_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_operator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_growth_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_account_operators ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow authenticated users)
CREATE POLICY "Users can view engagement tasks" ON ig_engagement_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage engagement tasks" ON ig_engagement_tasks FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view task batches" ON ig_task_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage task batches" ON ig_task_batches FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view influencer partnerships" ON ig_influencer_partnerships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage influencer partnerships" ON ig_influencer_partnerships FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view AI targets" ON ig_ai_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage AI targets" ON ig_ai_targets FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view operator stats" ON ig_operator_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage operator stats" ON ig_operator_stats FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view growth attribution" ON ig_growth_attribution FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage growth attribution" ON ig_growth_attribution FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view account operators" ON ig_account_operators FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage account operators" ON ig_account_operators FOR ALL TO authenticated USING (true);
