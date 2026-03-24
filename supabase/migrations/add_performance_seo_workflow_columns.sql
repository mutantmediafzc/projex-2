-- Migration: Add Performance Marketing and SEO & AEO workflow support to project_workflows table
-- Run this in your Supabase SQL Editor

-- First, add workflow_type column if it doesn't exist
ALTER TABLE project_workflows 
ADD COLUMN IF NOT EXISTS workflow_type text DEFAULT NULL;

-- Drop old constraint if exists (may fail silently if not exists)
DO $$ 
BEGIN
  ALTER TABLE project_workflows DROP CONSTRAINT IF EXISTS project_workflows_workflow_type_check;
EXCEPTION WHEN undefined_object THEN
  -- Constraint doesn't exist, continue
END $$;

-- Add new constraint with all workflow types
ALTER TABLE project_workflows 
ADD CONSTRAINT project_workflows_workflow_type_check 
CHECK (workflow_type IN ('design', 'website', 'performance_marketing', 'seo_aeo'));

-- Add performance_marketing_data column to store performance marketing workflow progress
ALTER TABLE project_workflows 
ADD COLUMN IF NOT EXISTS performance_marketing_data jsonb 
DEFAULT NULL;

-- Add seo_workflow_data column to store SEO & AEO workflow progress
ALTER TABLE project_workflows 
ADD COLUMN IF NOT EXISTS seo_workflow_data jsonb 
DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN project_workflows.performance_marketing_data IS 'Stores Performance Marketing workflow steps and progress (17-step campaign lifecycle)';
COMMENT ON COLUMN project_workflows.seo_workflow_data IS 'Stores SEO & AEO workflow steps and progress (4-phase SEO implementation)';
