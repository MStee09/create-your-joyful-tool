import type { 
  Season, 
  ProductMaster, 
  CommoditySpec, 
  DemandRollup,
  LiquidUnit,
  DryUnit,
} from '../types';
import { convertToGallons, convertToPounds } from './calculations';
import type { FieldAssignment, FieldCropOverride } from '@/types/field';
import { calculateFieldEffectiveApplications } from './fieldPlanCalculations';

/**
 * Calculate demand rollup for commodities from crop plans.
 * When field assignments and overrides are provided, uses field-weighted
 * acres and effective rates; otherwise falls back to crop template.
 */
export const calculateDemandRollup = (
  season: Season | null,
  productMasters: ProductMaster[],
  commoditySpecs: CommoditySpec[],
  fieldAssignments?: FieldAssignment[],
  fieldOverrides?: FieldCropOverride[]
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
  
  // Helper to add quantity to rollup
  const addToRollup = (
    productId: string,
    quantity: number,
    cropName: string
  ) => {
    const product = productMasters.find(p => p.id === productId);
    if (!product) return;
    
    // Only include bid-eligible products
    if (!product.isBidEligible) return;
    
    const spec = getSpecForProduct(productId);
    const rollupKey = spec?.id || product.id;
    const uom: 'ton' | 'gal' | 'lbs' = spec?.uom || (product.form === 'liquid' ? 'gal' : 'lbs');
    
    // Convert to target UOM if needed
    let convertedQty = quantity;
    if (uom === 'ton' && product.form === 'dry') {
      convertedQty = quantity / 2000; // lbs to tons
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
    const existingCrop = rollup.cropBreakdown.find(c => c.cropName === cropName);
    if (existingCrop) {
      existingCrop.qty += convertedQty;
    } else {
      rollup.cropBreakdown.push({ cropName: cropName, qty: convertedQty });
    }
  };
  
  // If we have field assignments, calculate demand using field-weighted data
  const hasFieldData = fieldAssignments && fieldAssignments.length > 0;
  
  season.crops.forEach(crop => {
    if (hasFieldData) {
      // Use field-specific calculations
      const cropAssignments = fieldAssignments!.filter(fa => fa.cropId === crop.id);
      
      if (cropAssignments.length > 0) {
        // Calculate demand per field with overrides
        cropAssignments.forEach(fa => {
          const overrides = fieldOverrides?.filter(o => o.fieldAssignmentId === fa.id) || [];
          const effectiveApps = calculateFieldEffectiveApplications(
            crop.applications,
            overrides,
            productMasters
          );
          
          const fieldAcres = fa.plannedAcres ?? fa.acres;
          
          effectiveApps.forEach(app => {
            if (app.isExcluded || app.effectiveRate <= 0) return;
            
            const product = productMasters.find(p => p.id === app.productId);
            if (!product) return;
            
            // Calculate quantity
            let quantityPerAcre = 0;
            if (product.form === 'liquid') {
              quantityPerAcre = convertToGallons(app.effectiveRate, app.unit as LiquidUnit);
            } else {
              quantityPerAcre = convertToPounds(app.effectiveRate, app.unit as DryUnit);
            }
            
            const totalQuantity = quantityPerAcre * fieldAcres;
            addToRollup(app.productId, totalQuantity, crop.name);
          });
        });
      } else {
        // No field assignments for this crop - fall back to template
        processCropTemplate(crop);
      }
    } else {
      // No field data - use crop template
      processCropTemplate(crop);
    }
  });
  
  // Helper to process crop template (fallback)
  function processCropTemplate(crop: typeof season.crops[0]) {
    crop.applications.forEach(app => {
      const product = productMasters.find(p => p.id === app.productId);
      if (!product) return;
      
      // Only include bid-eligible products
      if (!product.isBidEligible) return;
      
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
      addToRollup(app.productId, totalQuantity, crop.name);
    });
  }
  
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
