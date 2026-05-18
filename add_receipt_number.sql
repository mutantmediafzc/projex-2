-- Add receipt_number column to invoice_payments table
ALTER TABLE invoice_payments 
ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Backfill existing payments with generated receipt numbers
-- Format: REC-YYYYMMDD-XXXXXX (based on payment date and row number)
UPDATE invoice_payments
SET receipt_number = 'REC-' || TO_CHAR(payment_date, 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(id::text) FROM 1 FOR 6))
WHERE receipt_number IS NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_payments_receipt_number ON invoice_payments(receipt_number);

-- Make receipt_number NOT NULL for future inserts (optional - run after backfill is verified)
-- ALTER TABLE invoice_payments ALTER COLUMN receipt_number SET NOT NULL;
