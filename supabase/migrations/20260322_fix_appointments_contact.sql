-- Add contact_id column to appointments table for meetings with contacts
-- Make patient_id nullable since meetings can be with contacts instead of patients

-- Add contact_id column
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- Make patient_id nullable (if not already)
ALTER TABLE appointments 
  ALTER COLUMN patient_id DROP NOT NULL;

-- Create index for contact_id
CREATE INDEX IF NOT EXISTS appointments_contact_id_idx ON appointments(contact_id);
