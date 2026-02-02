// ============================================================================
// Application Variance - compares recorded field applications vs crop plan
// ============================================================================

import type { Season, Crop, ApplicationTiming, Application, Product } from '@/types/farm';
import type { Field, FieldAssignment } from '@/types/field';
import type { ApplicationRecord, ApplicationProductRecord } from '@/types/applicationRecord';

export interface PlannedApplication {
  cropId: string;
  cropName: string;
  timingId: string;
  timingName: string;
  productId: string;
  productName: string;
  plannedRate: number;
  rateUnit: string;
  plannedAcres: number; // weighted by tier percentage
  plannedTotal: number; // rate × acres
}

export interface ApplicationVarianceRow {
  cropId: string;
  cropName: string;
  timingId: string;
  timingName: string;
  productId: string;
  productName: string;
  rateUnit: string;

  // Planned
  plannedRate: number;
  plannedAcres: number;
  plannedTotal: number;

  // Actual (from application records)
  actualRate: number | null;
  actualAcres: number;
  actualTotal: number;

  // Variance
  rateVariance: number | null; // actual rate - planned rate
  rateVariancePct: number | null;
  totalVariance: number | null; // actual total - planned total
  totalVariancePct: number | null;

  // Status
  status: 'not-applied' | 'partial' | 'complete' | 'over-applied';
  applicationCount: number;
}

export interface ApplicationVarianceSummary {
  rows: ApplicationVarianceRow[];
  totals: {
    plannedAcres: number;
    appliedAcres: number;
    passesPlanned: number;
    passesStarted: number;
    passesComplete: number;
  };
}

const toNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

/**
 * Extract planned applications from crop plans, accounting for tier percentages
 */
function extractPlannedApplications(season: Season | null, products: Product[]): PlannedApplication[] {
  if (!season?.crops) return [];

  const result: PlannedApplication[] = [];

  for (const crop of season.crops) {
    const totalAcres = toNum(crop.totalAcres);
    if (totalAcres <= 0) continue;

    for (const app of crop.applications || []) {
      const timing = crop.applicationTimings?.find(t => t.id === app.timingId);
      const tier = crop.tiers?.find(t => t.id === app.tierId);
      const product = products.find(p => p.id === app.productId);
      if (!timing || !tier || !product) continue;

      const tierPct = toNum(tier.percentage) / 100;
      const plannedAcres = totalAcres * tierPct;
      const plannedRate = toNum(app.rate);
      const plannedTotal = plannedRate * plannedAcres;

      // Aggregate by crop+timing+product (in case same product appears multiple times)
      const existing = result.find(
        r => r.cropId === crop.id && r.timingId === app.timingId && r.productId === app.productId
      );

      if (existing) {
        existing.plannedAcres += plannedAcres;
        existing.plannedTotal += plannedTotal;
        // Keep the rate as-is (weighted average would be more complex)
      } else {
        // Determine rate unit from app or product
        const rateUnit = app.rateUnit || (product as any).defaultUnit || 'gal';

        result.push({
          cropId: crop.id,
          cropName: crop.name,
          timingId: app.timingId,
          timingName: timing.name,
          productId: app.productId,
          productName: product.name,
          plannedRate,
          rateUnit,
          plannedAcres,
          plannedTotal,
        });
      }
    }
  }

  return result;
}

/**
 * Aggregate actual applications from application records
 */
function aggregateActualApplications(
  records: ApplicationRecord[],
  seasonId: string | null
): Map<string, { totalApplied: number; totalAcres: number; avgRate: number; count: number }> {
  const map = new Map<string, { totalApplied: number; totalAcres: number; rateSum: number; count: number }>();

  for (const record of records) {
    if (seasonId && record.seasonId !== seasonId) continue;

    for (const prod of record.products || []) {
      const key = `${record.cropId}::${record.timingId}::${prod.productId}`;
      const curr = map.get(key) || { totalApplied: 0, totalAcres: 0, rateSum: 0, count: 0 };

      curr.totalApplied += toNum(prod.totalApplied);
      curr.totalAcres += toNum(record.acresTreated);
      curr.rateSum += toNum(prod.actualRate);
      curr.count += 1;

      map.set(key, curr);
    }
  }

  // Calculate average rate
  const result = new Map<string, { totalApplied: number; totalAcres: number; avgRate: number; count: number }>();
  for (const [key, val] of map.entries()) {
    result.set(key, {
      ...val,
      avgRate: val.count > 0 ? val.rateSum / val.count : 0,
    });
  }

  return result;
}

/**
 * Build the application variance report
 */
export function buildApplicationVarianceReport(opts: {
  season: Season | null;
  products: Product[];
  applicationRecords: ApplicationRecord[];
}): ApplicationVarianceSummary {
  const { season, products, applicationRecords } = opts;

  const planned = extractPlannedApplications(season, products);
  const actuals = aggregateActualApplications(applicationRecords, season?.id || null);

  const rows: ApplicationVarianceRow[] = [];

  let totalPlannedAcres = 0;
  let totalAppliedAcres = 0;
  let passesPlanned = 0;
  let passesStarted = 0;
  let passesComplete = 0;

  // Track unique passes (crop+timing)
  const passKeys = new Set<string>();

  for (const p of planned) {
    const key = `${p.cropId}::${p.timingId}::${p.productId}`;
    const passKey = `${p.cropId}::${p.timingId}`;
    const actual = actuals.get(key);

    passKeys.add(passKey);
    totalPlannedAcres += p.plannedAcres;

    const actualTotal = actual?.totalApplied || 0;
    const actualAcres = actual?.totalAcres || 0;
    const actualRate = actual ? actual.avgRate : null;
    const applicationCount = actual?.count || 0;

    totalAppliedAcres += actualAcres;

    // Calculate variances
    let rateVariance: number | null = null;
    let rateVariancePct: number | null = null;
    let totalVariance: number | null = null;
    let totalVariancePct: number | null = null;

    if (actualRate !== null) {
      rateVariance = actualRate - p.plannedRate;
      rateVariancePct = p.plannedRate > 0 ? (rateVariance / p.plannedRate) * 100 : null;
    }

    if (actualTotal > 0 || applicationCount > 0) {
      totalVariance = actualTotal - p.plannedTotal;
      totalVariancePct = p.plannedTotal > 0 ? (totalVariance / p.plannedTotal) * 100 : null;
    }

    // Determine status
    let status: ApplicationVarianceRow['status'] = 'not-applied';
    if (actualAcres > 0) {
      const coveragePct = (actualAcres / p.plannedAcres) * 100;
      if (coveragePct >= 95) {
        status = actualTotal > p.plannedTotal * 1.05 ? 'over-applied' : 'complete';
      } else {
        status = 'partial';
      }
    }

    rows.push({
      cropId: p.cropId,
      cropName: p.cropName,
      timingId: p.timingId,
      timingName: p.timingName,
      productId: p.productId,
      productName: p.productName,
      rateUnit: p.rateUnit,
      plannedRate: p.plannedRate,
      plannedAcres: p.plannedAcres,
      plannedTotal: p.plannedTotal,
      actualRate,
      actualAcres,
      actualTotal,
      rateVariance,
      rateVariancePct,
      totalVariance,
      totalVariancePct,
      status,
      applicationCount,
    });
  }

  // Count passes
  passesPlanned = passKeys.size;

  // Check which passes have been started/completed
  for (const passKey of passKeys) {
    const passRows = rows.filter(r => `${r.cropId}::${r.timingId}` === passKey);
    const started = passRows.some(r => r.applicationCount > 0);
    const complete = passRows.every(r => r.status === 'complete' || r.status === 'over-applied');

    if (started) passesStarted++;
    if (complete) passesComplete++;
  }

  // Sort by crop, then timing, then product
  rows.sort((a, b) => {
    if (a.cropName !== b.cropName) return a.cropName.localeCompare(b.cropName);
    if (a.timingName !== b.timingName) return a.timingName.localeCompare(b.timingName);
    return a.productName.localeCompare(b.productName);
  });

  return {
    rows,
    totals: {
      plannedAcres: totalPlannedAcres,
      appliedAcres: totalAppliedAcres,
      passesPlanned,
      passesStarted,
      passesComplete,
    },
  };
}
