-- Create tank_mix_recipes table for saved mix recipes
CREATE TABLE public.tank_mix_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  carrier_gpa NUMERIC NOT NULL DEFAULT 10,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- JSONB products structure:
-- [
--   {
--     "productId": "uuid",
--     "rate": 32,
--     "unit": "oz/ac"
--   }
-- ]

-- Enable RLS
ALTER TABLE public.tank_mix_recipes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own recipes"
  ON public.tank_mix_recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recipes"
  ON public.tank_mix_recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
  ON public.tank_mix_recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
  ON public.tank_mix_recipes FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_tank_mix_recipes_user_id ON public.tank_mix_recipes(user_id);

-- Updated_at trigger
CREATE TRIGGER update_tank_mix_recipes_updated_at
  BEFORE UPDATE ON public.tank_mix_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();