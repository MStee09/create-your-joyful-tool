-- Add manufacturer and extraction metadata columns to product_masters
ALTER TABLE product_masters 
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS manufacturer_website TEXT,
ADD COLUMN IF NOT EXISTS label_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS sds_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS extraction_source TEXT,
ADD COLUMN IF NOT EXISTS extraction_confidence TEXT,
ADD COLUMN IF NOT EXISTS last_extracted_at TIMESTAMPTZ;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_product_masters_manufacturer ON product_masters(manufacturer);
CREATE INDEX IF NOT EXISTS idx_product_masters_category ON product_masters(category);

-- Add comments for documentation
COMMENT ON COLUMN product_masters.manufacturer IS 'Product manufacturer name (distinct from vendor who sells it)';
COMMENT ON COLUMN product_masters.extraction_source IS 'Source of AI-extracted data: label-pdf, sds-pdf, manufacturer-website, manual';
COMMENT ON COLUMN product_masters.extraction_confidence IS 'Confidence level of AI extraction: high, medium, low';