ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS hr_access boolean NOT NULL DEFAULT false;

UPDATE users
SET hr_access = true
WHERE email IN ('jihan@mutant.ae', 'ralf@mutant.ae');
