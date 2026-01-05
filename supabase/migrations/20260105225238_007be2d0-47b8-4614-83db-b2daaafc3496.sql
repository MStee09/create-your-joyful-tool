-- Add container size and unit columns to vendor_offerings for container-based pricing
ALTER TABLE public.vendor_offerings ADD COLUMN IF NOT EXISTS container_size numeric;
ALTER TABLE public.vendor_offerings ADD COLUMN IF NOT EXISTS container_unit text;