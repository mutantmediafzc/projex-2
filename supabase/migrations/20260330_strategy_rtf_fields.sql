-- Add new RTF fields to social_strategy_links table
-- Note: content_pillars already exists as text[] in original schema, we're changing it to text for RTF

-- First drop the old array column if it exists and add as text
DO $$
BEGIN
  -- Check if content_pillars is an array type and convert to text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_strategy_links' 
    AND column_name = 'content_pillars' 
    AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE social_strategy_links DROP COLUMN content_pillars;
    ALTER TABLE social_strategy_links ADD COLUMN content_pillars text;
  END IF;
END $$;

-- Add other RTF columns
ALTER TABLE social_strategy_links 
ADD COLUMN IF NOT EXISTS kpi_description text,
ADD COLUMN IF NOT EXISTS platform_specific_strategy text;

-- Ensure content_pillars exists as text (in case table was freshly created)
ALTER TABLE social_strategy_links 
ADD COLUMN IF NOT EXISTS content_pillars text;

-- Add comment for documentation
COMMENT ON COLUMN social_strategy_links.kpi_description IS 'Rich text field for KPI descriptions';
COMMENT ON COLUMN social_strategy_links.content_pillars IS 'Rich text field for content pillars';
COMMENT ON COLUMN social_strategy_links.platform_specific_strategy IS 'Rich text field for platform-specific strategy details';
