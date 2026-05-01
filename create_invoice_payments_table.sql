-- Create invoice_payments table
CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
    reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated insert" ON invoice_payments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated select" ON invoice_payments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated update" ON invoice_payments
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete" ON invoice_payments
    FOR DELETE TO authenticated USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_invoice_payments_updated_at ON invoice_payments;
CREATE TRIGGER update_invoice_payments_updated_at
    BEFORE UPDATE ON invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
