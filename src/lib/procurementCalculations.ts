import type { 
  Season, 
  ProductMaster, 
  CommoditySpec, 
  DemandRollup,
  LiquidUnit,
  DryUnit,
} from '../types';
import { convertToGallons, convertToPounds } from './calculations';

/**
 * Calculate demand rollup for commodities from crop plans
 * Groups usage by commodity spec (or product if no spec)
 */
export const calculateDemandRollup = (
  season: Season | null,
  productMasters: ProductMaster[],
  commoditySpecs: CommoditySpec[]
): DemandRollup[] => {
  if (!season) return [];
  
  const rollupMap = new Map<string, DemandRollup>();
  
  // Helper to get spec for a product
  const getSpecForProduct = (productId: string): CommoditySpec | undefined => {
    const product = productMasters.find(p => p.id === productId);
    if (product?.commoditySpecId) {
      return commoditySpecs.find(s => s.id === product.commoditySpecId);
    }
    return undefined;
  };
  
  season.crops.forEach(crop => {
    crop.applications.forEach(app => {
      const product = productMasters.find(p => p.id === app.productId);
      if (!product) return;
      
      // Only include bid-eligible products
      if (!product.isBidEligible) return;
      
      const spec = getSpecForProduct(app.productId);
      const tier = crop.tiers.find(t => t.id === app.tierId);
      const tierAcres = tier ? crop.totalAcres * (tier.percentage / 100) : crop.totalAcres;
      
      // Calculate quantity
      let quantityPerAcre = 0;
      if (product.form === 'liquid') {
        quantityPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
      } else {
        quantityPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
      }
      
      const totalQuantity = quantityPerAcre * tierAcres;
      
      // Use spec ID if available, otherwise product ID
      const rollupKey = spec?.id || product.id;
      const uom: 'ton' | 'gal' | 'lbs' = spec?.uom || (product.form === 'liquid' ? 'gal' : 'lbs');
      
      // Convert to target UOM if needed
      let convertedQty = totalQuantity;
      if (uom === 'ton' && product.form === 'dry') {
        convertedQty = totalQuantity / 2000; // lbs to tons
      }
      
      if (!rollupMap.has(rollupKey)) {
        rollupMap.set(rollupKey, {
          specId: spec?.id || '',
          productId: product.id,
          productName: product.name,
          specName: spec?.specName || product.name,
          plannedQty: 0,
          uom,
          cropBreakdown: [],
        });
      }
      
      const rollup = rollupMap.get(rollupKey)!;
      rollup.plannedQty += convertedQty;
      
      // Add to crop breakdown
      const existingCrop = rollup.cropBreakdown.find(c => c.cropName === crop.name);
      if (existingCrop) {
        existingCrop.qty += convertedQty;
      } else {
        rollup.cropBreakdown.push({ cropName: crop.name, qty: convertedQty });
      }
    });
  });
  
  return Array.from(rollupMap.values()).sort((a, b) => b.plannedQty - a.plannedQty);
};

/**
 * Format quantity with appropriate precision based on UOM
 */
export const formatDemandQty = (qty: number, uom: 'ton' | 'gal' | 'lbs'): string => {
  if (uom === 'ton') {
    return qty.toFixed(2);
  }
  if (uom === 'gal') {
    return qty.toFixed(1);
  }
  return Math.round(qty).toLocaleString();
};

/**
 * Generate CSV content for bid sheet export
 */
export const generateBidSheetCSV = (
  demandRollup: DemandRollup[],
  seasonYear: number
): string => {
  const headers = ['Spec Name', 'Total Qty', 'UOM', 'Notes'];
  const rows = demandRollup.map(item => [
    `"${item.specName}"`,
    formatDemandQty(item.plannedQty, item.uom),
    item.uom,
    '"Delivered included"',
  ]);
  
  return [
    `# ${seasonYear} Bid Sheet`,
    headers.join(','),
    ...rows.map(r => r.join(',')),
  ].join('\n');
};
