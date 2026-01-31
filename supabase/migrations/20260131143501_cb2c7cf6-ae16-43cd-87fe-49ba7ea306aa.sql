-- =============================================
-- NEW TABLES FOR SIMPLIFIED PROCUREMENT
-- Replaces complex bid events, orders, invoices with simpler purchase tracking
-- =============================================

-- Price records: tracks every price quote and purchase price
CREATE TABLE IF NOT EXISTS price_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  
  -- Price information
  price NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'gal',
  normalized_price NUMERIC NOT NULL,
  
  -- Package information (optional)
  package_type TEXT,
  package_size NUMERIC,
  package_unit TEXT,
  quantity_purchased NUMERIC,
  
  -- Timing
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  season_year INTEGER NOT NULL,
  
  -- Classification
  type TEXT NOT NULL DEFAULT 'purchased',
  
  -- Linkage
  purchase_id UUID,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for price_records
CREATE INDEX IF NOT EXISTS idx_price_records_user_product 
  ON price_records(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_price_records_user_season 
  ON price_records(user_id, season_year);
CREATE INDEX IF NOT EXISTS idx_price_records_user_vendor 
  ON price_records(user_id, vendor_id);

-- Enable Row Level Security
ALTER TABLE price_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for price_records
CREATE POLICY "Users can view their own price_records"
  ON price_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own price_records"
  ON price_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own price_records"
  ON price_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price_records"
  ON price_records FOR DELETE
  USING (auth.uid() = user_id);

-- Add new columns to product_masters for simplified commodity tracking
ALTER TABLE product_masters 
  ADD COLUMN IF NOT EXISTS is_commodity BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS baseline_price NUMERIC,
  ADD COLUMN IF NOT EXISTS baseline_price_unit TEXT,
  ADD COLUMN IF NOT EXISTS baseline_price_date DATE,
  ADD COLUMN IF NOT EXISTS baseline_price_vendor_id UUID;