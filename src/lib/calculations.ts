import type { 
  LiquidUnit, 
  DryUnit, 
  Crop, 
  Product, 
  ProductMaster,
  VendorOffering,
  Tier,
  NutrientSummary,
  CropCosts,
  InventoryItem,
  ProductWithVendor,
  Vendor,
  ProductCategory,
} from '../types';

export const generateId = () => crypto.randomUUID();

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

// Calculate price per unit (e.g., per gram or per gallon) from offering
export const calculatePricePerUnit = (
  offering: VendorOffering,
  product: ProductMaster
): { pricePerGram?: number; pricePerPound?: number; pricePerGallon?: number } => {
  const result: { pricePerGram?: number; pricePerPound?: number; pricePerGallon?: number } = {};

  // Container-based pricing (e.g., $900/jug with 1800g per jug)
  if (offering.containerSize && offering.containerUnit && ['jug', 'bag', 'case', 'tote'].includes(offering.priceUnit || '')) {
    const containerPrice = offering.price;
    const containerQuantity = offering.containerSize;
    
    if (offering.containerUnit === 'g') {
      result.pricePerGram = containerPrice / containerQuantity;
      result.pricePerPound = result.pricePerGram * 453.592;
    } else if (offering.containerUnit === 'lbs') {
      result.pricePerPound = containerPrice / containerQuantity;
      result.pricePerGram = result.pricePerPound / 453.592;
    } else if (offering.containerUnit === 'oz') {
      result.pricePerPound = (containerPrice / containerQuantity) * 16;
      result.pricePerGram = result.pricePerPound / 453.592;
    } else if (offering.containerUnit === 'gal') {
      result.pricePerGallon = containerPrice / containerQuantity;
    }
    return result;
  }
  
  // Standard per-unit pricing
  if (offering.priceUnit === 'g') {
    result.pricePerGram = offering.price;
    result.pricePerPound = offering.price * 453.592;
  } else if (offering.priceUnit === 'lbs') {
    result.pricePerPound = offering.price;
    result.pricePerGram = offering.price / 453.592;
  } else if (offering.priceUnit === 'ton') {
    result.pricePerPound = offering.price / 2000;
    result.pricePerGram = result.pricePerPound / 453.592;
  } else if (offering.priceUnit === 'gal') {
    result.pricePerGallon = offering.price;
    if (product.densityLbsPerGal) {
      result.pricePerPound = offering.price / product.densityLbsPerGal;
    }
  }
  
  return result;
};

// Calculate crop costs using ProductMaster + VendorOfferings
export const calculateCropCostsNew = (
  crop: Crop, 
  productMasters: ProductMaster[], 
  vendorOfferings: VendorOffering[]
): CropCosts => {
  let totalCost = 0;
  let seedTreatmentCost = 0;
  const timingCosts: Record<string, number> = {};

  // Get preferred offering for a product
  const getPreferredOffering = (productId: string) => {
    return vendorOfferings.find(vo => vo.productId === productId && vo.isPreferred) 
      || vendorOfferings.find(vo => vo.productId === productId);
  };

  // Calculate application costs
  crop.applications.forEach(app => {
    const product = productMasters.find(p => p.id === app.productId);
    const offering = getPreferredOffering(app.productId);
    const tier = crop.tiers.find(t => t.id === app.tierId);
    if (!product || !offering || !tier) return;

    const tierAcres = crop.totalAcres * (tier.percentage / 100);
    let costPerAcre = 0;
    
    const prices = calculatePricePerUnit(offering, product);

    if (product.form === 'liquid') {
      const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
      costPerAcre = gallonsPerAcre * (prices.pricePerGallon ?? offering.price);
    } else {
      // Convert rate to grams for calculation
      if (app.rateUnit === 'g' && prices.pricePerGram !== undefined) {
        costPerAcre = app.rate * prices.pricePerGram;
      } else {
        const poundsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
        costPerAcre = poundsPerAcre * (prices.pricePerPound ?? offering.price);
      }
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
    const product = productMasters.find(p => p.id === st.productId);
    const offering = getPreferredOffering(st.productId);
    if (!product || !offering) return;

    const cwtPerAcre = st.plantingRateLbsPerAcre / 100;
    let productPerAcre = 0;

    if (st.rateUnit === 'oz') {
      productPerAcre = (st.ratePerCwt * cwtPerAcre) / 128;
    } else {
      productPerAcre = (st.ratePerCwt * cwtPerAcre) / 453.592 / 128;
    }

    const costPerAcre = productPerAcre * offering.price;
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

// Legacy: Calculate crop costs using old Product interface
export const calculateCropCosts = (crop: Crop, products: Product[]): CropCosts => {
  let totalCost = 0;
  let seedTreatmentCost = 0;
  const timingCosts: Record<string, number> = {};

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

  crop.seedTreatments.forEach(st => {
    const product = products.find(p => p.id === st.productId);
    if (!product) return;

    const cwtPerAcre = st.plantingRateLbsPerAcre / 100;
    let productPerAcre = 0;

    if (st.rateUnit === 'oz') {
      productPerAcre = (st.ratePerCwt * cwtPerAcre) / 128;
    } else {
      productPerAcre = (st.ratePerCwt * cwtPerAcre) / 453.592 / 128;
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

// Calculate nutrient summary for new product structure
export const calculateCropNutrientSummaryNew = (
  crop: Crop, 
  productMasters: ProductMaster[]
): NutrientSummary => {
  const summary: NutrientSummary = { n: 0, p: 0, k: 0, s: 0 };

  crop.applications.forEach(app => {
    const product = productMasters.find(p => p.id === app.productId);
    const tier = crop.tiers.find(t => t.id === app.tierId);
    if (!product?.analysis || !tier) return;

    let lbsPerAcre = 0;
    if (product.form === 'liquid') {
      const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
      lbsPerAcre = gallonsPerAcre * (product.densityLbsPerGal || 10);
    } else {
      lbsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
    }

    const tierWeight = tier.percentage / 100;

    summary.n += (lbsPerAcre * product.analysis.n / 100) * tierWeight;
    summary.p += (lbsPerAcre * product.analysis.p / 100) * tierWeight;
    summary.k += (lbsPerAcre * product.analysis.k / 100) * tierWeight;
    summary.s += (lbsPerAcre * product.analysis.s / 100) * tierWeight;
  });

  return summary;
};

// Legacy nutrient calculation
export const calculateCropNutrientSummary = (crop: Crop, products: Product[]): NutrientSummary => {
  const summary: NutrientSummary = { n: 0, p: 0, k: 0, s: 0 };

  crop.applications.forEach(app => {
    const product = products.find(p => p.id === app.productId);
    const tier = crop.tiers.find(t => t.id === app.tierId);
    if (!product?.analysis || !tier) return;

    let lbsPerAcre = 0;
    if (product.form === 'liquid') {
      const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
      lbsPerAcre = gallonsPerAcre * (product.densityLbsPerGal || 10);
    } else {
      lbsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
    }

    const tierWeight = tier.percentage / 100;

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

// NEW: Conversion helpers
export const calculateCostPerPound = (offering: VendorOffering, product: ProductMaster): number | null => {
  // Handle container-based pricing
  if (offering.containerSize && offering.containerUnit && ['jug', 'bag', 'case', 'tote'].includes(offering.priceUnit || '')) {
    const containerPrice = offering.price;
    const containerQuantity = offering.containerSize;
    
    if (offering.containerUnit === 'g') {
      // Convert price per gram to price per pound
      const pricePerGram = containerPrice / containerQuantity;
      return pricePerGram * 453.592;
    } else if (offering.containerUnit === 'lbs') {
      return containerPrice / containerQuantity;
    } else if (offering.containerUnit === 'oz') {
      return (containerPrice / containerQuantity) * 16;
    }
  }
  
  // Handle per-gram pricing
  if (offering.priceUnit === 'g') {
    return offering.price * 453.592;
  }
  
  if (product.form === 'liquid' && product.densityLbsPerGal) {
    if (offering.priceUnit === 'gal') {
      return offering.price / product.densityLbsPerGal;
    }
  }
  if (offering.priceUnit === 'lbs') {
    return offering.price;
  }
  if (offering.priceUnit === 'ton') {
    return offering.price / 2000;
  }
  return null;
};

export const calculateCostPerGallon = (offering: VendorOffering, product: ProductMaster): number | null => {
  if (offering.priceUnit === 'gal') {
    return offering.price;
  }
  if (product.form === 'liquid' && product.densityLbsPerGal) {
    if (offering.priceUnit === 'lbs') {
      return offering.price * product.densityLbsPerGal;
    }
  }
  return null;
};

// Get stock status
export const getStockStatus = (
  product: ProductMaster, 
  inventory: InventoryItem[]
): { totalOnHand: number; status: 'ok' | 'low' | 'out' } => {
  const items = inventory.filter(i => i.productId === product.id);
  const totalOnHand = items.reduce((sum, item) => sum + item.quantity, 0);
  
  if (totalOnHand === 0) {
    return { totalOnHand, status: 'out' };
  }
  if (product.reorderPoint && totalOnHand <= product.reorderPoint) {
    return { totalOnHand, status: 'low' };
  }
  return { totalOnHand, status: 'ok' };
};

// Enrich product with vendor and stock info
export const enrichProductWithVendor = (
  product: ProductMaster,
  vendorOfferings: VendorOffering[],
  vendors: Vendor[],
  inventory: InventoryItem[]
): ProductWithVendor => {
  const preferredOffering = vendorOfferings.find(vo => vo.productId === product.id && vo.isPreferred)
    || vendorOfferings.find(vo => vo.productId === product.id);
  
  const preferredVendor = preferredOffering 
    ? vendors.find(v => v.id === preferredOffering.vendorId) 
    : undefined;
  
  const stockInfo = getStockStatus(product, inventory);
  
  return {
    ...product,
    preferredOffering,
    preferredVendor,
    totalOnHand: stockInfo.totalOnHand,
    stockStatus: stockInfo.status,
  };
};

// Infer category from product name
export const inferProductCategory = (name: string, form: 'liquid' | 'dry'): ProductCategory => {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('seed treatment') || lowerName.includes('seed start')) return 'seed-treatment';
  if (lowerName.includes('fungicide') || lowerName.includes('prosaro')) return 'fungicide';
  if (lowerName.includes('herbicide')) return 'herbicide';
  if (lowerName.includes('insecticide')) return 'insecticide';
  if (lowerName.includes('adjuvant')) return 'adjuvant';
  
  // Check for fertilizers with analysis pattern
  if (/\d+-\d+-\d+/.test(name)) {
    return form === 'liquid' ? 'fertilizer-liquid' : 'fertilizer-dry';
  }
  
  // Common fertilizer names
  if (['ams', 'urea', 'kcl', 'sop', 'potash'].some(f => lowerName.includes(f))) {
    return form === 'liquid' ? 'fertilizer-liquid' : 'fertilizer-dry';
  }
  
  // Biologicals
  if (['bio', 'amino', 'humic', 'fulvic', 'carbon', 'boost'].some(f => lowerName.includes(f))) {
    return 'biological';
  }
  
  // Micronutrients
  if (['phloem', 'micro', 'zn', 'mn', 'fe', 'cu', 'boron', 'moly', 'cobalt'].some(f => lowerName.includes(f))) {
    return 'micronutrient';
  }
  
  return 'other';
};

// Category display names
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  'biological': 'Biological',
  'micronutrient': 'Micronutrient',
  'herbicide': 'Herbicide',
  'fungicide': 'Fungicide',
  'insecticide': 'Insecticide',
  'seed-treatment': 'Seed Treatment',
  'adjuvant': 'Adjuvant',
  'fertilizer-liquid': 'Fertilizer (Liquid)',
  'fertilizer-dry': 'Fertilizer (Dry)',
  'other': 'Other',
};

// Planned usage calculation for inventory readiness
export interface ProductUsage {
  cropName: string;
  timingName: string;
  acresTreated: number;
  quantityNeeded: number;
}

export interface PlannedUsageItem {
  productId: string;
  totalNeeded: number;
  unit: 'gal' | 'lbs' | 'g' | 'jug' | 'bag' | 'case' | 'tote';
  usages: ProductUsage[];
}

export const calculatePlannedUsage = (
  season: { crops: Array<{ 
    name: string; 
    totalAcres: number; 
    tiers: Array<{ id: string; percentage: number }>;
    applicationTimings: Array<{ id: string; name: string }>;
    applications: Array<{ productId: string; timingId: string; tierId?: string; rate: number; rateUnit: string; acresPercentage?: number }>;
    seedTreatments: Array<{ productId: string; ratePerCwt: number; rateUnit: string; plantingRateLbsPerAcre: number }>;
  }> } | null,
  products: Product[]
): PlannedUsageItem[] => {
  if (!season) return [];
  
  const usageMap = new Map<string, PlannedUsageItem>();
  
  season.crops.forEach(crop => {
    // Calculate application usage
    crop.applications.forEach(app => {
      const product = products.find(p => p.id === app.productId);
      if (!product) return;
      
      // Use acresPercentage if available, fall back to tier percentage
      let acresMultiplier = 1;
      if (app.acresPercentage !== undefined) {
        acresMultiplier = app.acresPercentage / 100;
      } else if (app.tierId) {
        const tier = crop.tiers.find(t => t.id === app.tierId);
        acresMultiplier = tier ? tier.percentage / 100 : 1;
      }
      const treatedAcres = crop.totalAcres * acresMultiplier;
      const timing = crop.applicationTimings.find(t => t.id === app.timingId);
      
      let totalQuantity = 0;
      let unit: 'gal' | 'lbs' | 'g' | 'jug' | 'bag' | 'case' | 'tote' = product.form === 'liquid' ? 'gal' : 'lbs';
      
      // Handle container-based products (e.g., $900/jug with 1800g per jug)
      const isContainerBased = product.containerSize && product.containerUnit && 
        ['jug', 'bag', 'case', 'tote'].includes(product.priceUnit || '');
      
      if (isContainerBased) {
        // Calculate total grams needed, then convert to containers
        let gramsPerAcre = 0;
        if (app.rateUnit === 'g') {
          gramsPerAcre = app.rate;
        } else if (app.rateUnit === 'oz') {
          gramsPerAcre = app.rate * 28.3495;
        } else if (app.rateUnit === 'lbs') {
          gramsPerAcre = app.rate * 453.592;
        }
        const totalGrams = gramsPerAcre * treatedAcres;
        
        // Convert container size to grams for calculation
        let containerGrams = product.containerSize!;
        if (product.containerUnit === 'lbs') {
          containerGrams = product.containerSize! * 453.592;
        } else if (product.containerUnit === 'oz') {
          containerGrams = product.containerSize! * 28.3495;
        }
        
        // Express in container units (e.g., jugs)
        totalQuantity = totalGrams / containerGrams;
        unit = product.priceUnit as 'jug' | 'bag' | 'case' | 'tote';
      } else if (product.form === 'liquid') {
        const quantityPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
        totalQuantity = quantityPerAcre * treatedAcres;
        unit = 'gal';
      } else {
        const quantityPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
        totalQuantity = quantityPerAcre * treatedAcres;
        unit = 'lbs';
      }
      
      if (!usageMap.has(app.productId)) {
        usageMap.set(app.productId, {
          productId: app.productId,
          totalNeeded: 0,
          unit,
          usages: [],
        });
      }
      
      const item = usageMap.get(app.productId)!;
      item.totalNeeded += totalQuantity;
      item.usages.push({
        cropName: crop.name,
        timingName: timing?.name || 'Unknown',
        acresTreated: treatedAcres,
        quantityNeeded: totalQuantity,
      });
    });
    
    // Calculate seed treatment usage
    crop.seedTreatments.forEach(st => {
      const product = products.find(p => p.id === st.productId);
      if (!product) return;
      
      const cwtPerAcre = st.plantingRateLbsPerAcre / 100;
      let productPerAcre = 0;
      
      if (st.rateUnit === 'oz') {
        productPerAcre = (st.ratePerCwt * cwtPerAcre) / 128; // oz to gallons
      } else {
        productPerAcre = (st.ratePerCwt * cwtPerAcre) / 453.592 / 128; // grams to gallons
      }
      
      const totalQuantity = productPerAcre * crop.totalAcres;
      
      if (!usageMap.has(st.productId)) {
        usageMap.set(st.productId, {
          productId: st.productId,
          totalNeeded: 0,
          unit: 'gal',
          usages: [],
        });
      }
      
      const item = usageMap.get(st.productId)!;
      item.totalNeeded += totalQuantity;
      item.usages.push({
        cropName: crop.name,
        timingName: 'Seed Treatment',
        acresTreated: crop.totalAcres,
        quantityNeeded: totalQuantity,
      });
    });
  });
  
  return Array.from(usageMap.values());
};
