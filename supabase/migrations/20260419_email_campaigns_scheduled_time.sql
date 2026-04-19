-- Add scheduled_time column to email_campaigns table
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
