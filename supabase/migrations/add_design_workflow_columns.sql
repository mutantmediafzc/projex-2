-- Migration: Add design workflow support to project_workflows table
-- Run this in your Supabase SQL Editor

-- Add workflow_type column to track which workflow type is being used
ALTER TABLE project_workflows 
ADD COLUMN IF NOT EXISTS workflow_type text 
CHECK (workflow_type IN ('design', 'website')) 
DEFAULT NULL;

-- Add design_workflow_data column to store design workflow progress
ALTER TABLE project_workflows 
ADD COLUMN IF NOT EXISTS design_workflow_data jsonb 
DEFAULT NULL;

-- Update existing website workflows to have the correct type
UPDATE project_workflows 
SET workflow_type = 'website' 
WHERE workflow_data IS NOT NULL 
  AND workflow_data != '[]'::jsonb 
  AND workflow_data != '{}'::jsonb
  AND workflow_type IS NULL;
