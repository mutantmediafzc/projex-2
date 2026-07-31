CREATE TABLE IF NOT EXISTS excalibur_leave_members (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  added_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE excalibur_leave_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON excalibur_leave_members TO authenticated;
