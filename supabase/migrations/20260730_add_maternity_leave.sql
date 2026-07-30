ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS maternity_leave_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maternity_leave_used numeric(5,1) NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS leaves
  DROP CONSTRAINT IF EXISTS leaves_leave_type_check;

ALTER TABLE IF EXISTS leaves
  ADD CONSTRAINT leaves_leave_type_check
  CHECK (leave_type IN ('annual', 'sick', 'unpaid', 'maternity'));
