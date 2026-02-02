// ============================================================================
// Field Comparison Utilities
// Calculate costs, nutrients, and history for field-level comparison
// ============================================================================

import type { Field, FieldAssignment } from '@/types/field';
import type { Crop, Product, Season, ProductMaster, PriceBookEntry } from '@/types';
import { calculateApplicationCostPerAcreWithPriceBook, calculateApplicationNutrients, getApplicationAcresPercentage } from './cropCalculations';

export interface FieldComparisonData {
  field: Field;
  assignment: FieldAssignment | null;
  cropName: string;
  cropId: string;
  totalCost: number;
  costPerAcre: number;
  nutrients: { n: number; p: number; k: number; s: number };
  ratios: { nToS: number | null; nToK: number | null };
  passCount: number;
  productCount: number;
}

export interface CropGroup {
  cropId: string;
  cropName: string;
  totalAcres: number;
  avgCostPerAcre: number;
  totalCost: number;
  fields: FieldComparisonData[];
  avgNutrients: { n: number; p: number; k: number; s: number };
  avgRatios: { nToS: number | null; nToK: number | null };
}

/**
 * Calculate field-level costs and nutrients from crop plan
 */
export function calculateFieldData(
  field: Field,
  assignment: FieldAssignment | null,
  crop: Crop | null,
  products: Product[],
  productMasters: ProductMaster[],
  priceBook: PriceBookEntry[],
  seasonYear: number
): FieldComparisonData {
  if (!assignment || !crop) {
    return {
      field,
      assignment: null,
      cropName: 'Unassigned',
      cropId: '',
      totalCost: 0,
      costPerAcre: 0,
      nutrients: { n: 0, p: 0, k: 0, s: 0 },
      ratios: { nToS: null, nToK: null },
      passCount: 0,
      productCount: 0,
    };
  }

  // Get unique passes and products
  const uniqueTimingIds = new Set(crop.applications.map(a => a.timingId));
  const uniqueProductIds = new Set(crop.applications.map(a => a.productId));

  let totalCost = 0;
  const nutrients = { n: 0, p: 0, k: 0, s: 0 };

  // Calculate costs and nutrients for field
  // Field acres may differ from crop.totalAcres, so we scale proportionally
  const fieldAcres = assignment.acres || field.acres;
  const scaleFactor = crop.totalAcres > 0 ? fieldAcres / crop.totalAcres : 1;

  crop.applications.forEach(app => {
    const product = products.find(p => p.id === app.productId);
    const acresPercentage = getApplicationAcresPercentage(app, crop);
    
    // Cost per acre using price book
    const costPerAcre = calculateApplicationCostPerAcreWithPriceBook(
      app,
      product,
      productMasters,
      priceBook,
      seasonYear
    );
    
    // Total cost for this application on this field
    const appAcres = fieldAcres * (acresPercentage / 100);
    totalCost += costPerAcre * appAcres;

    // Nutrients (weighted by acres percentage)
    const appNutrients = calculateApplicationNutrients(app, product);
    const weight = acresPercentage / 100;
    nutrients.n += appNutrients.n * weight;
    nutrients.p += appNutrients.p * weight;
    nutrients.k += appNutrients.k * weight;
    nutrients.s += appNutrients.s * weight;
  });

  // Calculate ratios
  const nToS = nutrients.s > 0.1 ? nutrients.n / nutrients.s : null;
  const nToK = nutrients.k > 0.1 ? nutrients.n / nutrients.k : null;

  return {
    field,
    assignment,
    cropName: crop.name,
    cropId: crop.id,
    totalCost,
    costPerAcre: fieldAcres > 0 ? totalCost / fieldAcres : 0,
    nutrients,
    ratios: { nToS, nToK },
    passCount: uniqueTimingIds.size,
    productCount: uniqueProductIds.size,
  };
}

/**
 * Group fields by crop and calculate aggregates
 */
export function groupFieldsByCrop(fieldData: FieldComparisonData[]): CropGroup[] {
  const groups = new Map<string, FieldComparisonData[]>();

  fieldData.forEach(fd => {
    if (!fd.cropId) return; // Skip unassigned fields
    
    const existing = groups.get(fd.cropId) || [];
    existing.push(fd);
    groups.set(fd.cropId, existing);
  });

  return Array.from(groups.entries()).map(([cropId, fields]) => {
    const totalAcres = fields.reduce((sum, f) => sum + (f.assignment?.acres || f.field.acres), 0);
    const totalCost = fields.reduce((sum, f) => sum + f.totalCost, 0);
    
    // Weighted average nutrients
    const avgNutrients = { n: 0, p: 0, k: 0, s: 0 };
    fields.forEach(f => {
      const acres = f.assignment?.acres || f.field.acres;
      const weight = totalAcres > 0 ? acres / totalAcres : 0;
      avgNutrients.n += f.nutrients.n * weight;
      avgNutrients.p += f.nutrients.p * weight;
      avgNutrients.k += f.nutrients.k * weight;
      avgNutrients.s += f.nutrients.s * weight;
    });

    // Average ratios
    const avgRatios = {
      nToS: avgNutrients.s > 0.1 ? avgNutrients.n / avgNutrients.s : null,
      nToK: avgNutrients.k > 0.1 ? avgNutrients.n / avgNutrients.k : null,
    };

    return {
      cropId,
      cropName: fields[0]?.cropName || 'Unknown',
      totalAcres,
      avgCostPerAcre: totalAcres > 0 ? totalCost / totalAcres : 0,
      totalCost,
      fields: fields.sort((a, b) => b.costPerAcre - a.costPerAcre), // Sort by cost desc
      avgNutrients,
      avgRatios,
    };
  }).sort((a, b) => b.totalAcres - a.totalAcres); // Sort by acres desc
}

/**
 * Calculate variance from crop average
 */
export function calculateVariance(fieldCostPerAcre: number, avgCostPerAcre: number): {
  amount: number;
  percentage: number;
  direction: 'over' | 'under' | 'even';
} {
  const amount = fieldCostPerAcre - avgCostPerAcre;
  const percentage = avgCostPerAcre > 0 ? (amount / avgCostPerAcre) * 100 : 0;
  
  return {
    amount,
    percentage,
    direction: percentage > 2 ? 'over' : percentage < -2 ? 'under' : 'even',
  };
}

/**
 * Get crop history for a field across seasons
 */
export function getFieldCropHistory(
  fieldId: string,
  fieldAssignments: FieldAssignment[],
  seasons: Season[]
): { year: number; cropName: string; actualYield?: number; yieldUnit?: string }[] {
  const assignments = fieldAssignments.filter(fa => fa.fieldId === fieldId);
  
  return assignments
    .map(fa => {
      const season = seasons.find(s => s.id === fa.seasonId);
      if (!season) return null;
      
      // Find crop name from season
      const crop = season.crops?.find((c: Crop) => c.id === fa.cropId);
      
      return {
        year: season.year,
        cropName: crop?.name || 'Unknown',
        actualYield: fa.actualYield,
        yieldUnit: fa.yieldUnit,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .sort((a, b) => b.year - a.year);
}
