-- Add new RTF fields to social_strategy_links table
ALTER TABLE social_strategy_links 
ADD COLUMN IF NOT EXISTS kpi_description text,
ADD COLUMN IF NOT EXISTS content_pillars text,
ADD COLUMN IF NOT EXISTS platform_specific_strategy text;

-- Add comment for documentation
COMMENT ON COLUMN social_strategy_links.kpi_description IS 'Rich text field for KPI descriptions';
COMMENT ON COLUMN social_strategy_links.content_pillars IS 'Rich text field for content pillars';
COMMENT ON COLUMN social_strategy_links.platform_specific_strategy IS 'Rich text field for platform-specific strategy details';
