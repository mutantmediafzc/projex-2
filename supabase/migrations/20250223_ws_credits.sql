-- Windsurf Credits tracking table
CREATE TABLE IF NOT EXISTS ws_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  prompts_used integer NOT NULL DEFAULT 0,
  logged_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS ws_credits_user_id_idx ON ws_credits(user_id);
CREATE INDEX IF NOT EXISTS ws_credits_project_id_idx ON ws_credits(project_id);
CREATE INDEX IF NOT EXISTS ws_credits_logged_at_idx ON ws_credits(logged_at);

-- Enable RLS
ALTER TABLE ws_credits ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all credits (for reporting)
CREATE POLICY "Allow authenticated users to view ws_credits"
  ON ws_credits FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert their own credits
CREATE POLICY "Allow users to insert ws_credits"
  ON ws_credits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own credits
CREATE POLICY "Allow users to update own ws_credits"
  ON ws_credits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to delete their own credits
CREATE POLICY "Allow users to delete own ws_credits"
  ON ws_credits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
