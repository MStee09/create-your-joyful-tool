-- Add estimated price fields for specialty products
ALTER TABLE public.product_masters 
  ADD COLUMN IF NOT EXISTS estimated_price numeric,
  ADD COLUMN IF NOT EXISTS estimated_price_unit text DEFAULT 'gal';