-- ============================================================================
-- Phase 1: Fields + Equipment Tables
-- ============================================================================

-- 1. Create fields table
CREATE TABLE public.fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  acres NUMERIC NOT NULL DEFAULT 0,
  farm TEXT,
  soil_type TEXT,
  ph NUMERIC,
  organic_matter NUMERIC,
  cec NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies for fields
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fields" 
  ON public.fields FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fields" 
  ON public.fields FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fields" 
  ON public.fields FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fields" 
  ON public.fields FOR DELETE 
  USING (auth.uid() = user_id);

-- Indexes for fields
CREATE INDEX idx_fields_user_id ON public.fields(user_id);
CREATE INDEX idx_fields_farm ON public.fields(farm);

-- Updated_at trigger for fields
CREATE TRIGGER update_fields_updated_at 
  BEFORE UPDATE ON public.fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create field_assignments table
CREATE TABLE public.field_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  season_id UUID REFERENCES public.seasons(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  crop_id TEXT NOT NULL,
  acres NUMERIC NOT NULL DEFAULT 0,
  yield_goal NUMERIC,
  yield_unit TEXT DEFAULT 'bu/ac',
  actual_yield NUMERIC,
  previous_crop_id TEXT,
  previous_crop_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies for field_assignments
ALTER TABLE public.field_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assignments" 
  ON public.field_assignments FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assignments" 
  ON public.field_assignments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assignments" 
  ON public.field_assignments FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assignments" 
  ON public.field_assignments FOR DELETE 
  USING (auth.uid() = user_id);

-- Indexes for field_assignments
CREATE INDEX idx_field_assignments_field_id ON public.field_assignments(field_id);
CREATE INDEX idx_field_assignments_season_id ON public.field_assignments(season_id);
CREATE INDEX idx_field_assignments_user_id ON public.field_assignments(user_id);

-- 3. Create equipment table
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'sprayer',
  tank_size NUMERIC NOT NULL DEFAULT 0,
  tank_unit TEXT NOT NULL DEFAULT 'gal',
  default_carrier_gpa NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies for equipment
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own equipment" 
  ON public.equipment FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own equipment" 
  ON public.equipment FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own equipment" 
  ON public.equipment FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own equipment" 
  ON public.equipment FOR DELETE 
  USING (auth.uid() = user_id);

-- Index for equipment
CREATE INDEX idx_equipment_user_id ON public.equipment(user_id);

-- Updated_at trigger for equipment
CREATE TRIGGER update_equipment_updated_at 
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();