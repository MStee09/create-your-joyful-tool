// ============================================================================
// Nutrient Efficiency - compares planned vs actual N-P-K-S delivery
// ============================================================================

import type { Season, Crop, Product } from '@/types/farm';
import type { ApplicationRecord, ApplicationProductRecord } from '@/types/applicationRecord';
import type { LiquidUnit, DryUnit } from '@/types';
import { convertToGallons, convertToPounds } from './calculations';

export interface NutrientTotals {
  n: number;
  p: number;
  k: number;
  s: number;
}

export interface NutrientEfficiencyRow {
  cropId: string;
  cropName: string;
  totalAcres: number;

  // Planned nutrients (lbs/ac, weighted by tier)
  plannedNutrients: NutrientTotals;

  // Actual nutrients from recorded applications (lbs/ac)
  actualNutrients: NutrientTotals;

  // Variance (actual - planned)
  varianceNutrients: NutrientTotals;
  variancePct: NutrientTotals;

  // Status
  status: 'not-started' | 'partial' | 'complete' | 'over-applied';
  applicationCount: number;
}

export interface NutrientEfficiencySummary {
  rows: NutrientEfficiencyRow[];
  totals: {
    plannedNutrients: NutrientTotals;
    actualNutrients: NutrientTotals;
    varianceNutrients: NutrientTotals;
    totalAcres: number;
  };
}

const toNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

/**
 * Calculate nutrient contribution from a single application (lbs/ac)
 */
function calculateNutrients(
  rate: number,
  rateUnit: string,
  analysis: { n: number; p: number; k: number; s: number } | undefined | null,
  form: 'liquid' | 'dry',
  densityLbsPerGal?: number
): NutrientTotals {
  if (!analysis) {
    return { n: 0, p: 0, k: 0, s: 0 };
  }

  let lbsPerAcre = 0;

  if (form === 'liquid') {
    const gallonsPerAcre = convertToGallons(rate, rateUnit as LiquidUnit);
    lbsPerAcre = gallonsPerAcre * (densityLbsPerGal || 10);
  } else {
    lbsPerAcre = convertToPounds(rate, rateUnit as DryUnit);
  }

  return {
    n: lbsPerAcre * (toNum(analysis.n) / 100),
    p: lbsPerAcre * (toNum(analysis.p) / 100),
    k: lbsPerAcre * (toNum(analysis.k) / 100),
    s: lbsPerAcre * (toNum(analysis.s) / 100),
  };
}

/**
 * Calculate planned nutrients per crop (weighted by tier percentage)
 */
function calculatePlannedNutrientsByCrop(
  season: Season | null,
  products: Product[]
): Map<string, { nutrients: NutrientTotals; acres: number; cropName: string }> {
  const map = new Map<string, { nutrients: NutrientTotals; acres: number; cropName: string }>();

  if (!season?.crops) return map;

  for (const crop of season.crops) {
    const totalAcres = toNum(crop.totalAcres);
    if (totalAcres <= 0) continue;

    const nutrients: NutrientTotals = { n: 0, p: 0, k: 0, s: 0 };

    for (const app of crop.applications || []) {
      const product = products.find(p => p.id === app.productId);
      const tier = crop.tiers?.find(t => t.id === app.tierId);
      if (!product || !tier) continue;

      const tierPct = toNum(tier.percentage) / 100;
      const appNutrients = calculateNutrients(
        toNum(app.rate),
        app.rateUnit || 'gal',
        product.analysis,
        product.form,
        product.densityLbsPerGal
      );

      // Weight by tier percentage for whole-crop average
      nutrients.n += appNutrients.n * tierPct;
      nutrients.p += appNutrients.p * tierPct;
      nutrients.k += appNutrients.k * tierPct;
      nutrients.s += appNutrients.s * tierPct;
    }

    map.set(crop.id, { nutrients, acres: totalAcres, cropName: crop.name });
  }

  return map;
}

/**
 * Calculate actual nutrients from recorded applications
 */
function calculateActualNutrientsByCrop(
  records: ApplicationRecord[],
  products: Product[],
  seasonId: string | null
): Map<string, { nutrients: NutrientTotals; totalAcres: number; count: number }> {
  const map = new Map<string, { nutrients: NutrientTotals; totalAcres: number; rateAccum: NutrientTotals; count: number }>();

  for (const record of records) {
    if (seasonId && record.seasonId !== seasonId) continue;

    const acresTreated = toNum(record.acresTreated);
    if (acresTreated <= 0) continue;

    for (const prod of record.products || []) {
      const product = products.find(p => p.id === prod.productId);
      if (!product) continue;

      const appNutrients = calculateNutrients(
        toNum(prod.actualRate),
        prod.rateUnit || 'gal',
        product.analysis,
        product.form,
        product.densityLbsPerGal
      );

      // Accumulate by crop
      const curr = map.get(record.cropId) || {
        nutrients: { n: 0, p: 0, k: 0, s: 0 },
        totalAcres: 0,
        rateAccum: { n: 0, p: 0, k: 0, s: 0 },
        count: 0,
      };

      // We need to calculate weighted average nutrients per acre
      // For now, accumulate (nutrients × acres) and divide later
      curr.rateAccum.n += appNutrients.n * acresTreated;
      curr.rateAccum.p += appNutrients.p * acresTreated;
      curr.rateAccum.k += appNutrients.k * acresTreated;
      curr.rateAccum.s += appNutrients.s * acresTreated;
      curr.totalAcres += acresTreated;
      curr.count += 1;

      map.set(record.cropId, curr);
    }
  }

  // Convert accumulated to per-acre averages
  const result = new Map<string, { nutrients: NutrientTotals; totalAcres: number; count: number }>();

  for (const [cropId, data] of map.entries()) {
    const acres = data.totalAcres;
    result.set(cropId, {
      nutrients: {
        n: acres > 0 ? data.rateAccum.n / acres : 0,
        p: acres > 0 ? data.rateAccum.p / acres : 0,
        k: acres > 0 ? data.rateAccum.k / acres : 0,
        s: acres > 0 ? data.rateAccum.s / acres : 0,
      },
      totalAcres: acres,
      count: data.count,
    });
  }

  return result;
}

/**
 * Build the nutrient efficiency report
 */
export function buildNutrientEfficiencyReport(opts: {
  season: Season | null;
  products: Product[];
  applicationRecords: ApplicationRecord[];
}): NutrientEfficiencySummary {
  const { season, products, applicationRecords } = opts;

  const planned = calculatePlannedNutrientsByCrop(season, products);
  const actuals = calculateActualNutrientsByCrop(applicationRecords, products, season?.id || null);

  const rows: NutrientEfficiencyRow[] = [];

  let totalPlanned: NutrientTotals = { n: 0, p: 0, k: 0, s: 0 };
  let totalActual: NutrientTotals = { n: 0, p: 0, k: 0, s: 0 };
  let totalAcres = 0;

  for (const [cropId, p] of planned.entries()) {
    const actual = actuals.get(cropId);

    const plannedNutrients = p.nutrients;
    const actualNutrients = actual?.nutrients || { n: 0, p: 0, k: 0, s: 0 };
    const applicationCount = actual?.count || 0;

    // Calculate variance
    const varianceNutrients: NutrientTotals = {
      n: actualNutrients.n - plannedNutrients.n,
      p: actualNutrients.p - plannedNutrients.p,
      k: actualNutrients.k - plannedNutrients.k,
      s: actualNutrients.s - plannedNutrients.s,
    };

    const variancePct: NutrientTotals = {
      n: plannedNutrients.n > 0 ? (varianceNutrients.n / plannedNutrients.n) * 100 : 0,
      p: plannedNutrients.p > 0 ? (varianceNutrients.p / plannedNutrients.p) * 100 : 0,
      k: plannedNutrients.k > 0 ? (varianceNutrients.k / plannedNutrients.k) * 100 : 0,
      s: plannedNutrients.s > 0 ? (varianceNutrients.s / plannedNutrients.s) * 100 : 0,
    };

    // Determine status based on N delivery (primary nutrient)
    let status: NutrientEfficiencyRow['status'] = 'not-started';
    if (applicationCount > 0) {
      const nRatio = plannedNutrients.n > 0 ? actualNutrients.n / plannedNutrients.n : 0;
      if (nRatio >= 0.95 && nRatio <= 1.05) {
        status = 'complete';
      } else if (nRatio > 1.05) {
        status = 'over-applied';
      } else {
        status = 'partial';
      }
    }

    // Accumulate totals (weighted by acres)
    totalPlanned.n += plannedNutrients.n * p.acres;
    totalPlanned.p += plannedNutrients.p * p.acres;
    totalPlanned.k += plannedNutrients.k * p.acres;
    totalPlanned.s += plannedNutrients.s * p.acres;

    totalActual.n += actualNutrients.n * p.acres;
    totalActual.p += actualNutrients.p * p.acres;
    totalActual.k += actualNutrients.k * p.acres;
    totalActual.s += actualNutrients.s * p.acres;

    totalAcres += p.acres;

    rows.push({
      cropId,
      cropName: p.cropName,
      totalAcres: p.acres,
      plannedNutrients,
      actualNutrients,
      varianceNutrients,
      variancePct,
      status,
      applicationCount,
    });
  }

  // Convert totals to per-acre
  const totalPlannedPerAcre: NutrientTotals = {
    n: totalAcres > 0 ? totalPlanned.n / totalAcres : 0,
    p: totalAcres > 0 ? totalPlanned.p / totalAcres : 0,
    k: totalAcres > 0 ? totalPlanned.k / totalAcres : 0,
    s: totalAcres > 0 ? totalPlanned.s / totalAcres : 0,
  };

  const totalActualPerAcre: NutrientTotals = {
    n: totalAcres > 0 ? totalActual.n / totalAcres : 0,
    p: totalAcres > 0 ? totalActual.p / totalAcres : 0,
    k: totalAcres > 0 ? totalActual.k / totalAcres : 0,
    s: totalAcres > 0 ? totalActual.s / totalAcres : 0,
  };

  const totalVariance: NutrientTotals = {
    n: totalActualPerAcre.n - totalPlannedPerAcre.n,
    p: totalActualPerAcre.p - totalPlannedPerAcre.p,
    k: totalActualPerAcre.k - totalPlannedPerAcre.k,
    s: totalActualPerAcre.s - totalPlannedPerAcre.s,
  };

  // Sort by acres (largest first)
  rows.sort((a, b) => b.totalAcres - a.totalAcres);

  return {
    rows,
    totals: {
      plannedNutrients: totalPlannedPerAcre,
      actualNutrients: totalActualPerAcre,
      varianceNutrients: totalVariance,
      totalAcres,
    },
  };
}
