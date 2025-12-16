import type { Crop, Product, Application, ApplicationTiming, LiquidUnit, DryUnit, CropType, TierLabel } from '@/types/farm';
import type { ProductMaster, PriceBookEntry } from '@/types';
import { convertToGallons, convertToPounds } from '@/utils/farmUtils';

// Auto-tier calculation based on 80/40 thresholds
export const calculateAutoTier = (treatedPercent: number): TierLabel => {
  if (treatedPercent >= 80) return 'core';
  if (treatedPercent >= 40) return 'selective';
  return 'trial';
};

// Get final tier (override takes precedence)
export const getTierFinal = (app: Application): TierLabel => {
  return app.tierOverride ?? app.tierAuto ?? calculateAutoTier(app.acresPercentage ?? 100);
};

// Tier display label (capitalized)
export const getTierDisplayLabel = (tier: TierLabel): string => {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
};

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

export interface IntensityBreakdown {
  passScore: number;
  selectivityScore: number;
  lateScore: number;
  costScore: number;
}

export type IntensityLabel = 'Low' | 'Moderate' | 'Managed' | 'High' | 'Very High';

export interface SeasonSummary {
  totalCost: number;
  costPerAcre: number;
  programIntensity: number; // 1-5 dots
  intensityLabel: IntensityLabel;
  intensityBreakdown?: IntensityBreakdown;
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

// Calculate cost per acre using price book for bid-eligible products
export const calculateApplicationCostPerAcreWithPriceBook = (
  app: Application,
  product: Product | undefined,
  productMasters: ProductMaster[],
  priceBook: PriceBookEntry[],
  seasonYear: number
): number => {
  if (!product) return 0;
  
  // Check if this product has a price book entry (from awarded bids)
  const productMaster = productMasters.find(pm => pm.id === product.id);
  if (productMaster?.isBidEligible) {
    // Look for price book entry
    const priceEntry = priceBook.find(pb => 
      pb.seasonYear === seasonYear && 
      (
        (productMaster.commoditySpecId && pb.specId === productMaster.commoditySpecId) ||
        pb.productId === product.id
      )
    );
    
    if (priceEntry) {
      // Use awarded price from price book
      if (product.form === 'liquid') {
        const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
        // Convert price if units differ
        if (priceEntry.priceUom === 'gal') {
          return gallonsPerAcre * priceEntry.price;
        }
        // priceEntry is per lb or ton, convert using density
        const density = product.densityLbsPerGal || 10;
        const lbsPerAcre = gallonsPerAcre * density;
        const pricePerLb = priceEntry.priceUom === 'ton' ? priceEntry.price / 2000 : priceEntry.price;
        return lbsPerAcre * pricePerLb;
      } else {
        const poundsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
        const pricePerPound = priceEntry.priceUom === 'ton' ? priceEntry.price / 2000 : priceEntry.price;
        return poundsPerAcre * pricePerPound;
      }
    }
  }
  
  // Fall back to regular product price
  return calculateApplicationCostPerAcre(app, product);
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

// Get tier label based on acres percentage (updated to 80/40 thresholds)
const getTierLabel = (acresPercentage: number): CoverageGroup['tierLabel'] => {
  if (acresPercentage >= 80) return 'Core';
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

// Price book context for calculations
export interface PriceBookContext {
  productMasters: ProductMaster[];
  priceBook: PriceBookEntry[];
  seasonYear: number;
}

// Calculate pass summary with price book integration
export const calculatePassSummaryWithPriceBook = (
  timing: ApplicationTiming,
  crop: Crop,
  products: Product[],
  priceBookContext: PriceBookContext
): PassSummary => {
  const applications = crop.applications.filter(a => a.timingId === timing.id);
  let totalCost = 0;
  let totalAcresPercentage = 0;
  const nutrients = { n: 0, p: 0, k: 0, s: 0 };

  applications.forEach(app => {
    const product = products.find(p => p.id === app.productId);
    const acresPercentage = getApplicationAcresPercentage(app, crop);
    const acresTreated = crop.totalAcres * (acresPercentage / 100);
    
    // Use price book-aware cost calculation
    const costPerAcre = calculateApplicationCostPerAcreWithPriceBook(
      app, 
      product,
      priceBookContext.productMasters,
      priceBookContext.priceBook,
      priceBookContext.seasonYear
    );
    
    totalCost += costPerAcre * acresTreated;
    totalAcresPercentage += acresPercentage;

    const appNutrients = calculateApplicationNutrients(app, product);
    const weight = acresPercentage / 100;
    nutrients.n += appNutrients.n * weight;
    nutrients.p += appNutrients.p * weight;
    nutrients.k += appNutrients.k * weight;
    nutrients.s += appNutrients.s * weight;
  });

  // Calculate coverage groups with price book
  const coverageGroups = calculateCoverageGroupsWithPriceBook(applications, crop, products, priceBookContext);
  const passPattern = determinePassPattern(coverageGroups);
  
  const dominantGroup = coverageGroups.reduce((max, g) => 
    g.applications.length > (max?.applications.length || 0) ? g : max, 
    coverageGroups[0]
  );
  
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

// Calculate coverage groups with price book
export const calculateCoverageGroupsWithPriceBook = (
  applications: Application[],
  crop: Crop,
  products: Product[],
  priceBookContext: PriceBookContext
): CoverageGroup[] => {
  const groupMap = new Map<number, { apps: Application[]; costSum: number }>();

  applications.forEach(app => {
    const product = products.find(p => p.id === app.productId);
    const acresPercentage = getApplicationAcresPercentage(app, crop);
    const bucket = bucketAcres(acresPercentage);
    const costPerAcre = calculateApplicationCostPerAcreWithPriceBook(
      app, 
      product,
      priceBookContext.productMasters,
      priceBookContext.priceBook,
      priceBookContext.seasonYear
    );

    if (!groupMap.has(bucket)) {
      groupMap.set(bucket, { apps: [], costSum: 0 });
    }
    const group = groupMap.get(bucket)!;
    group.apps.push(app);
    group.costSum += costPerAcre;
  });

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

// Late-season stage thresholds by crop type
const LATE_STAGE_THRESHOLDS: Record<CropType, string[]> = {
  corn: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'],
  soybeans: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'],
  wheat: ['Heading', 'Flowering', 'Grain Fill', 'Maturity'],
  small_grains: ['Heading', 'Flowering', 'Grain Fill', 'Maturity'],
  edible_beans: ['R1', 'R2', 'R3', 'R4', 'R5'],
  other: ['Late'],
};

// Check if a timing is "late season" based on crop type
const isLateSeasonTiming = (timing: ApplicationTiming, cropType: CropType): boolean => {
  const lateStages = LATE_STAGE_THRESHOLDS[cropType] || LATE_STAGE_THRESHOLDS.corn;
  return lateStages.includes(timing.growthStageStart || '') || 
         lateStages.includes(timing.growthStageEnd || '');
};

// Classify pass selectivity: trial (<40%), selective (40-79%), core (≥80%)
const getPassSelectivityType = (avgAcresPercentage: number): 'trial' | 'selective' | 'core' => {
  if (avgAcresPercentage < 40) return 'trial';
  if (avgAcresPercentage < 80) return 'selective';
  return 'core';
};

// Calculate true program intensity based on management pressure
export const calculateProgramIntensity = (
  crop: Crop,
  passSummaries: PassSummary[],
  cropCostPerAcre: number,
  farmAvgCostPerAcre: number = 100 // Default baseline
): { score: number; dots: number; label: IntensityLabel; breakdown: IntensityBreakdown } => {
  const REFERENCE_PASSES = 8;
  const LATE_REFERENCE = 2;
  
  // Only count passes with applications
  const activePasses = passSummaries.filter(p => p.applications.length > 0);
  
  // 1. Pass Count Pressure (40%) - "How many times do I go across the field?"
  const totalPasses = activePasses.length;
  const passScore = Math.min(totalPasses / REFERENCE_PASSES, 1.0);
  
  // 2. Selectivity Load (30%) - "How much am I managing parts of the field differently?"
  let selectivityNumerator = 0;
  activePasses.forEach(pass => {
    const type = getPassSelectivityType(pass.avgAcresPercentage);
    if (type === 'trial') selectivityNumerator += 1.0;      // Trials count full
    else if (type === 'selective') selectivityNumerator += 0.7; // Selective counts 70%
    // Core passes don't add selectivity load
  });
  const selectivityScore = Math.min(selectivityNumerator / REFERENCE_PASSES, 1.0);
  
  // 3. Late-Season Pressure (20%) - "How far into the season am I still making decisions?"
  const cropType = crop.cropType || 'corn';
  const latePasses = activePasses.filter(p => 
    isLateSeasonTiming(p.timing, cropType)
  ).length;
  const lateScore = Math.min(latePasses / LATE_REFERENCE, 1.0);
  
  // 4. Cost Deviation (10%) - Only boosts if meaningfully above average
  const costDeviation = farmAvgCostPerAcre > 0 
    ? (cropCostPerAcre - farmAvgCostPerAcre) / farmAvgCostPerAcre 
    : 0;
  const costScore = Math.max(0, Math.min(costDeviation, 0.3));
  
  // Combined score (0-1)
  const score = 
    0.4 * passScore +
    0.3 * selectivityScore +
    0.2 * lateScore +
    0.1 * costScore;
  
  // Map to dots (1-5)
  const dots = score <= 0.2 ? 1 : score <= 0.4 ? 2 : score <= 0.6 ? 3 : score <= 0.8 ? 4 : 5;
  
  // Label
  const labels: IntensityLabel[] = ['Low', 'Moderate', 'Managed', 'High', 'Very High'];
  const label = labels[dots - 1];
  
  return { 
    score, 
    dots, 
    label, 
    breakdown: { passScore, selectivityScore, lateScore, costScore } 
  };
};

// Calculate full season summary
export const calculateSeasonSummary = (
  crop: Crop,
  products: Product[],
  farmAvgCostPerAcre?: number
): SeasonSummary => {
  const passSummaries = crop.applicationTimings.map(timing => 
    calculatePassSummary(timing, crop, products)
  );

  let totalCost = 0;
  const nutrients = { n: 0, p: 0, k: 0, s: 0 };

  passSummaries.forEach(pass => {
    totalCost += pass.totalCost;
    nutrients.n += pass.nutrients.n;
    nutrients.p += pass.nutrients.p;
    nutrients.k += pass.nutrients.k;
    nutrients.s += pass.nutrients.s;
  });

  const costPerAcre = crop.totalAcres > 0 ? totalCost / crop.totalAcres : 0;
  
  // Calculate true intensity using the new model
  const intensity = calculateProgramIntensity(
    crop, 
    passSummaries, 
    costPerAcre, 
    farmAvgCostPerAcre
  );

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
    costPerAcre,
    programIntensity: intensity.dots,
    intensityLabel: intensity.label,
    intensityBreakdown: intensity.breakdown,
    status,
    nutrients,
    nutrientTiming,
  };
};

// Calculate full season summary with price book integration
export const calculateSeasonSummaryWithPriceBook = (
  crop: Crop,
  products: Product[],
  priceBookContext: PriceBookContext,
  farmAvgCostPerAcre?: number
): SeasonSummary => {
  const passSummaries = crop.applicationTimings.map(timing => 
    calculatePassSummaryWithPriceBook(timing, crop, products, priceBookContext)
  );

  let totalCost = 0;
  const nutrients = { n: 0, p: 0, k: 0, s: 0 };

  passSummaries.forEach(pass => {
    totalCost += pass.totalCost;
    nutrients.n += pass.nutrients.n;
    nutrients.p += pass.nutrients.p;
    nutrients.k += pass.nutrients.k;
    nutrients.s += pass.nutrients.s;
  });

  const costPerAcre = crop.totalAcres > 0 ? totalCost / crop.totalAcres : 0;
  
  const intensity = calculateProgramIntensity(
    crop, 
    passSummaries, 
    costPerAcre, 
    farmAvgCostPerAcre
  );

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
    costPerAcre,
    programIntensity: intensity.dots,
    intensityLabel: intensity.label,
    intensityBreakdown: intensity.breakdown,
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
