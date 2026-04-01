-- Change ewm_ctr_goal from integer to numeric to support decimal values like 1.73
ALTER TABLE social_kpis 
ALTER COLUMN ewm_ctr_goal TYPE numeric(10,2) USING ewm_ctr_goal::numeric(10,2);

-- Also update seo_impressions_goal to support decimals
ALTER TABLE social_kpis 
ALTER COLUMN seo_impressions_goal TYPE numeric(10,2) USING seo_impressions_goal::numeric(10,2);
