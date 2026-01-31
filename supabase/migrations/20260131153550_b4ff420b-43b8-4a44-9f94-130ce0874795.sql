-- =============================================
-- ADD NEW SIMPLIFIED PURCHASE COLUMNS TO EXISTING PURCHASES TABLE
-- This migration adds the new fields needed for SimplePurchase
-- =============================================

-- Add season_id column (text to reference season IDs)
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS season_id TEXT;

-- Add delivery tracking columns
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS received_date DATE;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE;

-- Add freight tracking columns
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS freight_cost NUMERIC DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS freight_notes TEXT;

-- Add simplified lines column (rename line_items to lines if needed)
-- The existing line_items column will work fine, we just need to ensure the JSONB structure matches

-- Add subtotal and total columns
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;

-- Ensure status only allows 'ordered' or 'received' (matches SimplePurchase)
-- No migration needed - the existing status column is TEXT

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_purchases_season_id ON purchases(user_id, season_id);
CREATE INDEX IF NOT EXISTS idx_purchases_order_date ON purchases(order_date);

-- Update existing records to populate new columns from old columns
UPDATE purchases 
SET 
  order_date = COALESCE(date::date, CURRENT_DATE),
  subtotal = COALESCE(total_cost, 0),
  total = COALESCE(total_cost, 0)
WHERE order_date IS NULL;