-- Add work status fields to users table
-- work_status: 'available', 'on_leave', 'wfh' (work from home)
-- status_updated_at: timestamp of last status update (for daily prompt logic)

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS work_status text DEFAULT 'available' CHECK (work_status IN ('available', 'on_leave', 'wfh')),
ADD COLUMN IF NOT EXISTS status_updated_at timestamptz DEFAULT now();

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS users_work_status_idx ON users(work_status);

-- Update existing users to have default status
UPDATE users SET work_status = 'available', status_updated_at = now() WHERE work_status IS NULL;
