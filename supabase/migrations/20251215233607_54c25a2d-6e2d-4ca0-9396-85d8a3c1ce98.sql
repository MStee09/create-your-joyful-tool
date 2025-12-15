-- Persist procurement flags on products and allow linking products <-> commodity specs

ALTER TABLE public.product_masters
ADD COLUMN IF NOT EXISTS product_type text,
ADD COLUMN IF NOT EXISTS is_bid_eligible boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS commodity_spec_id uuid;

ALTER TABLE public.commodity_specs
ADD COLUMN IF NOT EXISTS product_id uuid;

CREATE INDEX IF NOT EXISTS idx_product_masters_is_bid_eligible
ON public.product_masters (user_id, is_bid_eligible);

CREATE INDEX IF NOT EXISTS idx_product_masters_product_type
ON public.product_masters (user_id, product_type);

CREATE INDEX IF NOT EXISTS idx_product_masters_commodity_spec_id
ON public.product_masters (user_id, commodity_spec_id);

CREATE INDEX IF NOT EXISTS idx_commodity_specs_product_id
ON public.commodity_specs (user_id, product_id);

-- Optional (safe) foreign keys between user-scoped tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_masters_commodity_spec_id_fkey'
  ) THEN
    ALTER TABLE public.product_masters
      ADD CONSTRAINT product_masters_commodity_spec_id_fkey
      FOREIGN KEY (commodity_spec_id)
      REFERENCES public.commodity_specs (id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commodity_specs_product_id_fkey'
  ) THEN
    ALTER TABLE public.commodity_specs
      ADD CONSTRAINT commodity_specs_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES public.product_masters (id)
      ON DELETE SET NULL;
  END IF;
END $$;