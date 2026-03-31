-- Add platform-specific KPI goals columns to social_kpis table
-- Each KPI has separate goal fields per platform

-- Impressions goals by platform
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS impressions_facebook_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS impressions_instagram_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS impressions_linkedin_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS impressions_tiktok_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS impressions_youtube_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS impressions_x_goal text;

-- Reach goals by platform
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS reach_facebook_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS reach_instagram_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS reach_linkedin_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS reach_tiktok_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS reach_youtube_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS reach_x_goal text;

-- Engagement goals by platform
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS engagement_facebook_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS engagement_instagram_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS engagement_linkedin_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS engagement_tiktok_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS engagement_youtube_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS engagement_x_goal text;

-- Followers goals by platform
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS followers_facebook_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS followers_instagram_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS followers_linkedin_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS followers_tiktok_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS followers_youtube_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS followers_x_goal text;

-- Clicks goals by platform
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS clicks_facebook_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS clicks_instagram_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS clicks_linkedin_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS clicks_tiktok_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS clicks_youtube_goal text;
ALTER TABLE social_kpis ADD COLUMN IF NOT EXISTS clicks_x_goal text;
