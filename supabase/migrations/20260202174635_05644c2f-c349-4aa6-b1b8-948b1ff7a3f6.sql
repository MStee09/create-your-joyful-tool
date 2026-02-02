-- Create field_crop_overrides table for field-specific rate adjustments
CREATE TABLE public.field_crop_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  field_assignment_id UUID NOT NULL REFERENCES public.field_assignments(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL,
  override_type TEXT NOT NULL DEFAULT 'rate_adjust',
  rate_adjustment NUMERIC,
  custom_rate NUMERIC,
  custom_unit TEXT,
  product_id UUID REFERENCES public.product_masters(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.field_crop_overrides ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own overrides"
  ON public.field_crop_overrides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own overrides"
  ON public.field_crop_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own overrides"
  ON public.field_crop_overrides FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own overrides"
  ON public.field_crop_overrides FOR DELETE
  USING (auth.uid() = user_id);

-- Add planning columns to field_assignments
ALTER TABLE public.field_assignments 
  ADD COLUMN IF NOT EXISTS planned_acres NUMERIC,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster lookups
CREATE INDEX idx_field_crop_overrides_assignment 
  ON public.field_crop_overrides(field_assignment_id);