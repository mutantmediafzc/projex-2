CREATE TABLE IF NOT EXISTS leave_policy_settings (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  standard_annual_total numeric(5,1) NOT NULL DEFAULT 30,
  standard_sick_total numeric(5,1) NOT NULL DEFAULT 90,
  standard_lieu_total numeric(5,1) NOT NULL DEFAULT 0,
  excalibur_annual_total numeric(5,1) NOT NULL DEFAULT 25,
  excalibur_sick_total numeric(5,1) NOT NULL DEFAULT 0,
  excalibur_lieu_total numeric(5,1) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO leave_policy_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;
