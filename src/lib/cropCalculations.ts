import type { Crop, Product, Application, ApplicationTiming, LiquidUnit, DryUnit } from '@/types/farm';
import { convertToGallons, convertToPounds } from '@/utils/farmUtils';

export interface CoverageGroup {
  acresPercentage: number;
  tierLabel: 'Core' | 'Selective' | 'Trial';
  applications: Application[];
  costPerTreatedAcre: number;
  costPerFieldAcre: number;
  acresTreated: number;
}

export type PassPattern = 'uniform' | 'selective' | 'trial';

export interface PassSummary {
  timing: ApplicationTiming;
  applications: Application[];
  totalCost: number;
  avgAcresPercentage: number;
  nutrients: { n: number; p: number; k: number; s: number };
  // Multi-modal fields
  coverageGroups: CoverageGroup[];
  passPattern: PassPattern;
  dominantAcres: number;
  costPerTreatedAcre: number;
  costPerFieldAcre: number;
}

export interface SeasonSummary {
  totalCost: number;
  costPerAcre: number;
  programIntensity: number; // 0-5 scale based on avg acres coverage
  status: 'balanced' | 'heavy-early' | 'heavy-late' | 'skewed';
  nutrients: { n: number; p: number; k: number; s: number };
  nutrientTiming: {
    early: { n: number; p: number; k: number; s: number };
    mid: { n: number; p: number; k: number; s: number };
    late: { n: number; p: number; k: number; s: number };
  };
}

// Get acres percentage from application (new field or fallback to tier)
export const getApplicationAcresPercentage = (
  app: Application,
  crop: Crop
): number => {
  // Use new acresPercentage if available
  if (app.acresPercentage !== undefined) {
    return app.acresPercentage;
  }
  // Fallback to tier percentage for backward compatibility
  const tier = crop.tiers.find(t => t.id === app.tierId);
  return tier?.percentage || 100;
};

// Calculate cost per acre for an application
export const calculateApplicationCostPerAcre = (
  app: Application,
  product: Product | undefined
): number => {
  if (!product) return 0;

  if (product.form === 'liquid') {
    const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
    return gallonsPerAcre * product.price;
  } else {
    const poundsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
    const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
    return poundsPerAcre * pricePerPound;
  }
};

// Calculate nutrients from an application
export const calculateApplicationNutrients = (
  app: Application,
  product: Product | undefined
): { n: number; p: number; k: number; s: number } => {
  const result = { n: 0, p: 0, k: 0, s: 0 };
  if (!product?.analysis) return result;

  let lbsPerAcre = 0;
  if (product.form === 'liquid') {
    const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
    lbsPerAcre = gallonsPerAcre * (product.densityLbsPerGal || 10);
  } else {
    lbsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
  }

  result.n = (lbsPerAcre * product.analysis.n) / 100;
  result.p = (lbsPerAcre * product.analysis.p) / 100;
  result.k = (lbsPerAcre * product.analysis.k) / 100;
  result.s = (lbsPerAcre * product.analysis.s) / 100;

  return result;
};

// Get tier label based on acres percentage
const getTierLabel = (acresPercentage: number): CoverageGroup['tierLabel'] => {
  if (acresPercentage >= 75) return 'Core';
  if (acresPercentage >= 40) return 'Selective';
  return 'Trial';
};

// Bucket acres percentage for grouping (allows ±5% variance in same group)
const bucketAcres = (acresPercentage: number): number => {
  if (acresPercentage >= 95) return 100;
  if (acresPercentage >= 55 && acresPercentage <= 70) return 60;
  if (acresPercentage >= 20 && acresPercentage <= 30) return 25;
  return Math.round(acresPercentage / 10) * 10; // Round to nearest 10
};

// Calculate coverage groups for a pass
export const calculateCoverageGroups = (
  applications: Application[],
  crop: Crop,
  products: Product[]
): CoverageGroup[] => {
  const groupMap = new Map<number, { apps: Application[]; costSum: number }>();

  applications.forEach(app => {
    const product = products.find(p => p.id === app.productId);
    const acresPercentage = getApplicationAcresPercentage(app, crop);
    const bucket = bucketAcres(acresPercentage);
    const costPerAcre = calculateApplicationCostPerAcre(app, product);

    if (!groupMap.has(bucket)) {
      groupMap.set(bucket, { apps: [], costSum: 0 });
    }
    const group = groupMap.get(bucket)!;
    group.apps.push(app);
    group.costSum += costPerAcre;
  });

  // Convert to array and sort by acres descending
  return Array.from(groupMap.entries())
    .map(([acresPercentage, { apps, costSum }]) => ({
      acresPercentage,
      tierLabel: getTierLabel(acresPercentage),
      applications: apps,
      costPerTreatedAcre: costSum,
      costPerFieldAcre: costSum * (acresPercentage / 100),
      acresTreated: crop.totalAcres * (acresPercentage / 100),
    }))
    .sort((a, b) => b.acresPercentage - a.acresPercentage);
};

// Determine pass pattern
export const determinePassPattern = (coverageGroups: CoverageGroup[]): PassPattern => {
  if (coverageGroups.length === 0) return 'uniform';
  
  // Check if all products have same acres (±5%)
  const acresValues = coverageGroups.map(g => g.acresPercentage);
  const maxAcres = Math.max(...acresValues);
  const minAcres = Math.min(...acresValues);
  
  if (maxAcres - minAcres <= 10 && coverageGroups.length === 1) {
    // Uniform - all same tier
    if (maxAcres <= 30) return 'trial';
    return 'uniform';
  }
  
  // Check if majority is trial
  const totalApps = coverageGroups.reduce((sum, g) => sum + g.applications.length, 0);
  const trialApps = coverageGroups
    .filter(g => g.acresPercentage <= 30)
    .reduce((sum, g) => sum + g.applications.length, 0);
  
  if (trialApps / totalApps > 0.5) return 'trial';
  
  return 'selective';
};

// Calculate pass summary
export const calculatePassSummary = (
  timing: ApplicationTiming,
  crop: Crop,
  products: Product[]
): PassSummary => {
  const applications = crop.applications.filter(a => a.timingId === timing.id);
  let totalCost = 0;
  let totalAcresPercentage = 0;
  const nutrients = { n: 0, p: 0, k: 0, s: 0 };

  applications.forEach(app => {
    const product = products.find(p => p.id === app.productId);
    const acresPercentage = getApplicationAcresPercentage(app, crop);
    const acresTreated = crop.totalAcres * (acresPercentage / 100);
    const costPerAcre = calculateApplicationCostPerAcre(app, product);
    
    totalCost += costPerAcre * acresTreated;
    totalAcresPercentage += acresPercentage;

    const appNutrients = calculateApplicationNutrients(app, product);
    const weight = acresPercentage / 100;
    nutrients.n += appNutrients.n * weight;
    nutrients.p += appNutrients.p * weight;
    nutrients.k += appNutrients.k * weight;
    nutrients.s += appNutrients.s * weight;
  });

  // Calculate coverage groups
  const coverageGroups = calculateCoverageGroups(applications, crop, products);
  const passPattern = determinePassPattern(coverageGroups);
  
  // Find dominant acres (most products)
  const dominantGroup = coverageGroups.reduce((max, g) => 
    g.applications.length > (max?.applications.length || 0) ? g : max, 
    coverageGroups[0]
  );
  
  // Calculate total cost per treated/field acre
  const totalCostPerTreated = coverageGroups.reduce((sum, g) => sum + g.costPerTreatedAcre, 0);
  const totalCostPerField = coverageGroups.reduce((sum, g) => sum + g.costPerFieldAcre, 0);

  return {
    timing,
    applications,
    totalCost,
    avgAcresPercentage: applications.length > 0 ? totalAcresPercentage / applications.length : 0,
    nutrients,
    coverageGroups,
    passPattern,
    dominantAcres: dominantGroup?.acresPercentage || 100,
    costPerTreatedAcre: totalCostPerTreated,
    costPerFieldAcre: totalCostPerField,
  };
};

// Calculate full season summary
export const calculateSeasonSummary = (
  crop: Crop,
  products: Product[]
): SeasonSummary => {
  const passSummaries = crop.applicationTimings.map(timing => 
    calculatePassSummary(timing, crop, products)
  );

  let totalCost = 0;
  const nutrients = { n: 0, p: 0, k: 0, s: 0 };
  let totalIntensity = 0;

  passSummaries.forEach(pass => {
    totalCost += pass.totalCost;
    nutrients.n += pass.nutrients.n;
    nutrients.p += pass.nutrients.p;
    nutrients.k += pass.nutrients.k;
    nutrients.s += pass.nutrients.s;
    totalIntensity += pass.avgAcresPercentage;
  });

  // Normalize intensity to 0-5 scale (100% avg = 5)
  const avgIntensity = passSummaries.length > 0 
    ? totalIntensity / passSummaries.length 
    : 0;
  const programIntensity = Math.min(5, (avgIntensity / 100) * 5);

  // Calculate nutrient timing distribution
  const numTimings = passSummaries.length;
  const earlyEnd = Math.floor(numTimings / 3);
  const midEnd = Math.floor((2 * numTimings) / 3);

  const nutrientTiming = {
    early: { n: 0, p: 0, k: 0, s: 0 },
    mid: { n: 0, p: 0, k: 0, s: 0 },
    late: { n: 0, p: 0, k: 0, s: 0 },
  };

  passSummaries.forEach((pass, idx) => {
    const target = idx < earlyEnd ? 'early' : idx < midEnd ? 'mid' : 'late';
    nutrientTiming[target].n += pass.nutrients.n;
    nutrientTiming[target].p += pass.nutrients.p;
    nutrientTiming[target].k += pass.nutrients.k;
    nutrientTiming[target].s += pass.nutrients.s;
  });

  // Determine status based on cost distribution
  const earlyCost = passSummaries.slice(0, earlyEnd).reduce((sum, p) => sum + p.totalCost, 0);
  const lateCost = passSummaries.slice(midEnd).reduce((sum, p) => sum + p.totalCost, 0);
  const earlyRatio = totalCost > 0 ? earlyCost / totalCost : 0;
  const lateRatio = totalCost > 0 ? lateCost / totalCost : 0;

  let status: SeasonSummary['status'] = 'balanced';
  if (earlyRatio > 0.6) status = 'heavy-early';
  else if (lateRatio > 0.6) status = 'heavy-late';
  else if (Math.abs(earlyRatio - lateRatio) > 0.4) status = 'skewed';

  return {
    totalCost,
    costPerAcre: crop.totalAcres > 0 ? totalCost / crop.totalAcres : 0,
    programIntensity,
    status,
    nutrients,
    nutrientTiming,
  };
};

// Migrate application to use acresPercentage
export const migrateApplicationToAcresPercentage = (
  app: Application,
  crop: Crop
): Application => {
  if (app.acresPercentage !== undefined) return app;
  
  const tier = crop.tiers.find(t => t.id === app.tierId);
  return {
    ...app,
    acresPercentage: tier?.percentage || 100,
  };
};

// Preset tier buttons
export const ACRES_PRESETS = [
  { label: '100%', value: 100 },
  { label: '60%', value: 60 },
  { label: '25%', value: 25 },
  { label: 'Custom', value: -1 },
];
