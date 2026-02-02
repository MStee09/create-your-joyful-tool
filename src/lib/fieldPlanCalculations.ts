// ============================================================================
// Field Plan Calculations - Phase 4: Field-Level Overrides and Weighted Averages
// ============================================================================

import type { Application } from '@/types/farm';
import type { ProductMaster } from '@/types';
import type { FieldCropOverride, FieldAssignmentExtended, EffectiveApplication } from '@/types/field';
import type { PriceBookContext } from '@/lib/cropCalculations';

/**
 * Calculate effective applications for a field assignment.
 * Merges crop template with field overrides using this priority:
 * 1. Field exclusion → product not applied
 * 2. Field absolute rate → use custom_rate directly
 * 3. Field rate adjustment → base rate × multiplier
 * 4. Field-only addition → included even if not in template
 * 5. Template inheritance → use base rate unchanged
 */
export function calculateFieldEffectiveApplications(
  cropApplications: Application[],
  overrides: FieldCropOverride[],
  products: ProductMaster[]
): EffectiveApplication[] {
  const effectiveApps: EffectiveApplication[] = [];
  const overrideMap = new Map(overrides.map(o => [o.applicationId, o]));
  
  // Process template applications
  for (const app of cropApplications) {
    const override = overrideMap.get(app.id);
    const product = products.find(p => p.id === app.productId);
    
    if (!product) continue;
    
    // Check if excluded
    if (override?.overrideType === 'exclude') {
      effectiveApps.push({
        applicationId: app.id,
        productId: app.productId,
        productName: product.name,
        baseRate: app.rate,
        effectiveRate: 0,
        unit: app.rateUnit,
        isExcluded: true,
        isFieldOnly: false,
        overrideNote: 'Excluded',
      });
      continue;
    }
    
    let effectiveRate = app.rate;
    let overrideNote: string | undefined;
    
    if (override) {
      if (override.overrideType === 'absolute' && override.customRate !== undefined) {
        // Use absolute rate directly
        effectiveRate = override.customRate;
        overrideNote = `Set to ${override.customRate} ${override.customUnit || app.rateUnit}`;
      } else if (override.overrideType === 'rate_adjust' && override.rateAdjustment !== undefined) {
        // Apply multiplier
        effectiveRate = app.rate * override.rateAdjustment;
        const pct = Math.round((override.rateAdjustment - 1) * 100);
        overrideNote = pct >= 0 ? `+${pct}%` : `${pct}%`;
      }
    }
    
    effectiveApps.push({
      applicationId: app.id,
      productId: app.productId,
      productName: product.name,
      baseRate: app.rate,
      effectiveRate,
      unit: override?.customUnit || app.rateUnit,
      isExcluded: false,
      isFieldOnly: false,
      overrideNote,
    });
  }
  
  // Add field-only additions
  const addOverrides = overrides.filter(o => o.overrideType === 'add' && o.productId);
  for (const add of addOverrides) {
    const product = products.find(p => p.id === add.productId);
    if (!product) continue;
    
    effectiveApps.push({
      applicationId: add.id,
      productId: add.productId!,
      productName: product.name,
      baseRate: 0,
      effectiveRate: add.customRate || 0,
      unit: add.customUnit || product.defaultUnit || 'gal',
      isExcluded: false,
      isFieldOnly: true,
      overrideNote: 'Field-only',
    });
  }
  
  return effectiveApps;
}

/**
 * Calculate cost per acre for a specific field based on effective applications.
 * Uses estimated prices from ProductMaster for simplified calculation.
 */
export function calculateFieldCostPerAcre(
  effectiveApplications: EffectiveApplication[],
  products: ProductMaster[],
  priceBookContext: PriceBookContext
): number {
  let totalCostPerAcre = 0;
  
  for (const app of effectiveApplications) {
    if (app.isExcluded || app.effectiveRate <= 0) continue;
    
    const product = products.find(p => p.id === app.productId);
    if (!product) continue;
    
    // Try to get price from price book first
    const priceEntry = priceBookContext.priceBook.find(pb => 
      pb.productId === product.id || 
      (product.commoditySpecId && (pb.specId === product.commoditySpecId || pb.commoditySpecId === product.commoditySpecId))
    );
    
    let pricePerUnit = 0;
    let priceUnit = app.unit;
    
    if (priceEntry) {
      pricePerUnit = priceEntry.price;
      priceUnit = priceEntry.unit || priceEntry.priceUom || app.unit;
    } else if (product.estimatedPrice) {
      pricePerUnit = product.estimatedPrice;
      priceUnit = product.estimatedPriceUnit || product.defaultUnit || 'gal';
    }
    
    // Simple calculation - assumes rate and price are in compatible units
    // For more complex unit conversion, would need to add density handling
    if (priceUnit === 'ton') {
      // Convert ton price to lbs
      totalCostPerAcre += app.effectiveRate * (pricePerUnit / 2000);
    } else {
      totalCostPerAcre += app.effectiveRate * pricePerUnit;
    }
  }
  
  return totalCostPerAcre;
}

/**
 * Calculate nutrients for a field based on effective applications
 */
export function calculateFieldNutrients(
  effectiveApplications: EffectiveApplication[],
  products: ProductMaster[]
): { n: number; p: number; k: number; s: number } {
  const nutrients = { n: 0, p: 0, k: 0, s: 0 };
  
  for (const app of effectiveApplications) {
    if (app.isExcluded || app.effectiveRate <= 0) continue;
    
    const product = products.find(p => p.id === app.productId);
    if (!product?.analysis) continue;
    
    const analysis = product.analysis;
    const rate = app.effectiveRate;
    
    // Apply analysis percentages to rate
    if (typeof analysis === 'object' && analysis !== null) {
      const a = analysis as { n?: number; p?: number; k?: number; s?: number };
      if (a.n) nutrients.n += rate * (a.n / 100);
      if (a.p) nutrients.p += rate * (a.p / 100);
      if (a.k) nutrients.k += rate * (a.k / 100);
      if (a.s) nutrients.s += rate * (a.s / 100);
    }
  }
  
  return nutrients;
}

/**
 * Calculate weighted average for crop across all assigned fields
 */
export function calculateCropWeightedAverage(
  fieldAssignments: FieldAssignmentExtended[],
  metric: 'cost' | 'n' | 'p' | 'k' | 's'
): number {
  if (fieldAssignments.length === 0) return 0;
  
  let totalWeightedValue = 0;
  let totalAcres = 0;
  
  for (const fa of fieldAssignments) {
    const acres = fa.plannedAcres ?? fa.acres;
    if (acres <= 0) continue;
    
    let value = 0;
    if (metric === 'cost') {
      value = fa.costPerAcre ?? 0;
    } else if (fa.nutrients) {
      value = fa.nutrients[metric] ?? 0;
    }
    
    totalWeightedValue += value * acres;
    totalAcres += acres;
  }
  
  return totalAcres > 0 ? totalWeightedValue / totalAcres : 0;
}

/**
 * Check if a pass/timing has any field-specific overrides.
 * Used for PassCard ⚡ badge.
 */
export function passHasFieldOverrides(
  timingId: string,
  cropApplications: Application[],
  allOverrides: FieldCropOverride[]
): { hasOverrides: boolean; fieldCount: number } {
  // Get application IDs for this timing
  const timingAppIds = new Set(
    cropApplications.filter(a => a.timingId === timingId).map(a => a.id)
  );
  
  // Check how many unique field assignments have overrides for these applications
  const fieldAssignmentIds = new Set<string>();
  
  for (const override of allOverrides) {
    if (timingAppIds.has(override.applicationId)) {
      fieldAssignmentIds.add(override.fieldAssignmentId);
    }
  }
  
  return {
    hasOverrides: fieldAssignmentIds.size > 0,
    fieldCount: fieldAssignmentIds.size,
  };
}

/**
 * Get override summary text for display (e.g., "No Atrazine, AMS → 2.5 lbs/ac")
 */
export function getOverrideSummaryText(
  overrides: FieldCropOverride[],
  cropApplications: Application[],
  products: ProductMaster[]
): string {
  if (overrides.length === 0) return '';
  
  const summaryParts: string[] = [];
  
  for (const override of overrides) {
    if (override.overrideType === 'add') {
      const product = products.find(p => p.id === override.productId);
      if (product) {
        summaryParts.push(`+${product.name} @ ${override.customRate} ${override.customUnit}`);
      }
      continue;
    }
    
    const app = cropApplications.find(a => a.id === override.applicationId);
    if (!app) continue;
    
    const product = products.find(p => p.id === app.productId);
    if (!product) continue;
    
    if (override.overrideType === 'exclude') {
      summaryParts.push(`No ${product.name}`);
    } else if (override.overrideType === 'absolute' && override.customRate !== undefined) {
      summaryParts.push(`${product.name} → ${override.customRate} ${override.customUnit || app.rateUnit}`);
    } else if (override.overrideType === 'rate_adjust' && override.rateAdjustment !== undefined) {
      const pct = Math.round((override.rateAdjustment - 1) * 100);
      const sign = pct >= 0 ? '+' : '';
      summaryParts.push(`${product.name} ${sign}${pct}%`);
    }
  }
  
  return summaryParts.join(', ');
}

/**
 * Calculate variance percentage from crop average
 */
export function calculateVarianceFromAverage(
  fieldCostPerAcre: number,
  cropAverageCostPerAcre: number
): number {
  if (cropAverageCostPerAcre === 0) return 0;
  return ((fieldCostPerAcre - cropAverageCostPerAcre) / cropAverageCostPerAcre) * 100;
}
