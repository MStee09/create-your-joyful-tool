import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface CostSnapshot {
  id: string;
  seasonYear: number;
  cropId: string;
  costPerAcre: number;
  totalCost: number;
  snapshotReason: string;
  createdAt: string;
}

export function useCostSnapshots(user: User | null, seasonYear: number) {
  const [snapshots, setSnapshots] = useState<CostSnapshot[]>([]);
  const lastSnapshotRef = useRef<Map<string, { costPerAcre: number; totalCost: number }>>(new Map());

  const fetchSnapshots = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('crop_plan_cost_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .eq('season_year', seasonYear)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const mapped: CostSnapshot[] = data.map((row: any) => ({
        id: row.id,
        seasonYear: row.season_year,
        cropId: row.crop_id,
        costPerAcre: Number(row.cost_per_acre),
        totalCost: Number(row.total_cost),
        snapshotReason: row.snapshot_reason,
        createdAt: row.created_at,
      }));
      setSnapshots(mapped);

      // Initialize last snapshot cache
      const cache = new Map<string, { costPerAcre: number; totalCost: number }>();
      mapped.forEach(s => {
        cache.set(s.cropId, { costPerAcre: s.costPerAcre, totalCost: s.totalCost });
      });
      lastSnapshotRef.current = cache;
    }
  }, [user, seasonYear]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const saveCostSnapshot = useCallback(async (
    cropId: string,
    costPerAcre: number,
    totalCost: number,
    reason: string,
  ) => {
    if (!user) return;

    // Only skip if cost is exactly the same (allow even tiny changes to be recorded)
    const last = lastSnapshotRef.current.get(cropId);
    if (last && last.costPerAcre === costPerAcre && last.totalCost === totalCost) {
      return;
    }

    const { data, error } = await supabase
      .from('crop_plan_cost_snapshots')
      .insert({
        user_id: user.id,
        season_year: seasonYear,
        crop_id: cropId,
        cost_per_acre: costPerAcre,
        total_cost: totalCost,
        snapshot_reason: reason,
      })
      .select()
      .single();

    if (!error && data) {
      const snapshot: CostSnapshot = {
        id: data.id,
        seasonYear: data.season_year,
        cropId: data.crop_id,
        costPerAcre: Number(data.cost_per_acre),
        totalCost: Number(data.total_cost),
        snapshotReason: data.snapshot_reason,
        createdAt: data.created_at,
      };
      setSnapshots(prev => [...prev, snapshot]);
      lastSnapshotRef.current.set(cropId, { costPerAcre, totalCost });
    }
  }, [user, seasonYear]);

  const getSnapshotsForCrop = useCallback((cropId: string) => {
    return snapshots.filter(s => s.cropId === cropId);
  }, [snapshots]);

  return { snapshots, saveCostSnapshot, getSnapshotsForCrop, refetchSnapshots: fetchSnapshots };
}
