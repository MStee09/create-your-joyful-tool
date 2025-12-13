import type { 
  LiquidUnit, 
  DryUnit, 
  Crop, 
  Product, 
  Tier,
  NutrientSummary,
  CropCosts
} from '../types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const convertToGallons = (value: number, unit: LiquidUnit): number => {
  switch (unit) {
    case 'oz': return value / 128;
    case 'qt': return value / 4;
    case 'gal': return value;
    default: return value;
  }
};

export const convertToPounds = (value: number, unit: DryUnit): number => {
  switch (unit) {
    case 'oz': return value / 16;
    case 'g': return value / 453.592;
    case 'lbs': return value;
    case 'ton': return value * 2000;
    default: return value;
  }
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const calculateCropCosts = (crop: Crop, products: Product[]): CropCosts => {
  let totalCost = 0;
  let seedTreatmentCost = 0;
  const timingCosts: Record<string, number> = {};

  // Calculate application costs
  crop.applications.forEach(app => {
    const product = products.find(p => p.id === app.productId);
    const tier = crop.tiers.find(t => t.id === app.tierId);
    if (!product || !tier) return;

    const tierAcres = crop.totalAcres * (tier.percentage / 100);
    let costPerAcre = 0;

    if (product.form === 'liquid') {
      const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
      costPerAcre = gallonsPerAcre * product.price;
    } else {
      const poundsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
      const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
      costPerAcre = poundsPerAcre * pricePerPound;
    }

    const tierCost = costPerAcre * tierAcres;
    totalCost += tierCost;

    if (!timingCosts[app.timingId]) {
      timingCosts[app.timingId] = 0;
    }
    timingCosts[app.timingId] += tierCost;
  });

  // Calculate seed treatment costs
  crop.seedTreatments.forEach(st => {
    const product = products.find(p => p.id === st.productId);
    if (!product) return;

    // Convert rate per CWT to cost per acre based on planting rate
    const cwtPerAcre = st.plantingRateLbsPerAcre / 100;
    let productPerAcre = 0;

    if (st.rateUnit === 'oz') {
      productPerAcre = (st.ratePerCwt * cwtPerAcre) / 128; // oz to gal
    } else {
      productPerAcre = (st.ratePerCwt * cwtPerAcre) / 453.592 / 128; // g to gal (approx)
    }

    const costPerAcre = productPerAcre * product.price;
    seedTreatmentCost += costPerAcre * crop.totalAcres;
  });

  totalCost += seedTreatmentCost;

  return {
    totalCost,
    costPerAcre: crop.totalAcres > 0 ? totalCost / crop.totalAcres : 0,
    timingCosts,
    seedTreatmentCost,
  };
};

export const calculateCropNutrientSummary = (crop: Crop, products: Product[]): NutrientSummary => {
  const summary: NutrientSummary = { n: 0, p: 0, k: 0, s: 0 };

  crop.applications.forEach(app => {
    const product = products.find(p => p.id === app.productId);
    const tier = crop.tiers.find(t => t.id === app.tierId);
    if (!product?.analysis || !tier) return;

    // Calculate lbs of product per acre
    let lbsPerAcre = 0;
    if (product.form === 'liquid') {
      const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
      lbsPerAcre = gallonsPerAcre * (product.densityLbsPerGal || 10);
    } else {
      lbsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
    }

    // Weight by tier percentage (for simplicity, use full rate for nutrient calc)
    const tierWeight = tier.percentage / 100;

    // Calculate nutrient lbs per acre
    summary.n += (lbsPerAcre * product.analysis.n / 100) * tierWeight;
    summary.p += (lbsPerAcre * product.analysis.p / 100) * tierWeight;
    summary.k += (lbsPerAcre * product.analysis.k / 100) * tierWeight;
    summary.s += (lbsPerAcre * product.analysis.s / 100) * tierWeight;
  });

  return summary;
};

export const createDefaultTiers = (): Tier[] => [
  { id: generateId(), name: 'Core Plan', percentage: 100 },
  { id: generateId(), name: 'Tier 2', percentage: 60 },
  { id: generateId(), name: 'Tier 3', percentage: 25 },
  { id: generateId(), name: 'Tier 4', percentage: 15 },
  { id: generateId(), name: 'Tier 5', percentage: 8 },
];

export const createDefaultCrop = (name: string, acres: number): Crop => ({
  id: generateId(),
  name,
  totalAcres: acres,
  tiers: createDefaultTiers(),
  applicationTimings: [],
  applications: [],
  seedTreatments: [],
});

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
