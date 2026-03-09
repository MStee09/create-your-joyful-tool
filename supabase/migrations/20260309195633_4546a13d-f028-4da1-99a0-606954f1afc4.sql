
CREATE TABLE public.crop_plan_cost_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  season_year integer NOT NULL,
  crop_id text NOT NULL,
  cost_per_acre numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  snapshot_reason text NOT NULL DEFAULT 'plan_edit',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crop_plan_cost_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots"
  ON public.crop_plan_cost_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own snapshots"
  ON public.crop_plan_cost_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snapshots"
  ON public.crop_plan_cost_snapshots FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_cost_snapshots_user_season_crop
  ON public.crop_plan_cost_snapshots (user_id, season_year, crop_id);
