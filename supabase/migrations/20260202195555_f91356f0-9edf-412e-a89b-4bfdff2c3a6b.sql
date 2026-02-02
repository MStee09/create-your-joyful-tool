-- Create application_records table for Phase 5: Application Recording
CREATE TABLE public.application_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  crop_id TEXT NOT NULL,
  field_id UUID NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
  timing_id TEXT NOT NULL,
  date_applied DATE NOT NULL DEFAULT CURRENT_DATE,
  acres_treated NUMERIC NOT NULL DEFAULT 0,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  carrier_gpa NUMERIC,
  applicator TEXT NOT NULL DEFAULT 'self',
  custom_applicator_name TEXT,
  weather_notes TEXT,
  notes TEXT,
  overridden_warnings JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.application_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own application records"
ON public.application_records
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own application records"
ON public.application_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own application records"
ON public.application_records
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own application records"
ON public.application_records
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_application_records_updated_at
BEFORE UPDATE ON public.application_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_application_records_user_id ON public.application_records(user_id);
CREATE INDEX idx_application_records_season_id ON public.application_records(season_id);
CREATE INDEX idx_application_records_field_id ON public.application_records(field_id);
CREATE INDEX idx_application_records_crop_timing ON public.application_records(crop_id, timing_id);