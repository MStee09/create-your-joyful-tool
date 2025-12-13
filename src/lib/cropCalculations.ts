import type { Crop, Product, Application, ApplicationTiming, LiquidUnit, DryUnit } from '@/types/farm';
import { convertToGallons, convertToPounds } from '@/utils/farmUtils';

export interface PassSummary {
  timing: ApplicationTiming;
  applications: Application[];
  totalCost: number;
  avgAcresPercentage: number;
  nutrients: { n: number; p: number; k: number; s: number };
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

  return {
    timing,
    applications,
    totalCost,
    avgAcresPercentage: applications.length > 0 ? totalAcresPercentage / applications.length : 0,
    nutrients,
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
