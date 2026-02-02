// ============================================================================
// Tank Mix Calculations
// Per-load product amounts, mixing order, and load sheet generation
// ============================================================================

import type { ProductMaster } from '@/types';
import type { Equipment } from '@/types/field';
import type { 
  TankMixProduct, 
  TankMixRecipe, 
  LoadCalculation, 
  TankLoadSheet,
  QuickMixInput,
} from '@/types/tankMix';
import type { ChemicalData, MixingOrderCategory } from '@/types/chemicalData';
import { MIXING_ORDER_GUIDE, getDefaultMixingOrder } from '@/types/chemicalData';

// Unit conversion factors to oz (for liquids) or lbs (for dry)
const LIQUID_TO_OZ: Record<string, number> = {
  'oz/ac': 1,
  'pt/ac': 16,
  'qt/ac': 32,
  'gal/ac': 128,
  'fl oz/ac': 1,
};

const DRY_TO_LBS: Record<string, number> = {
  'lbs/ac': 1,
  'oz/ac': 0.0625, // 1/16
  'ton/ac': 2000,
};

/**
 * Convert a rate to base units (oz for liquid, lbs for dry)
 */
export function rateToBaseUnits(
  rate: number, 
  unit: string, 
  form: 'liquid' | 'dry'
): number {
  if (form === 'liquid') {
    const factor = LIQUID_TO_OZ[unit] || 1;
    return rate * factor;
  } else {
    const factor = DRY_TO_LBS[unit] || 1;
    return rate * factor;
  }
}

/**
 * Convert base units back to practical display units
 * Returns [amount, unit]
 */
export function baseToDisplayUnits(
  amount: number,
  form: 'liquid' | 'dry'
): [number, string] {
  if (form === 'liquid') {
    // Convert oz to most readable unit
    if (amount >= 128) {
      return [amount / 128, 'gal'];
    } else if (amount >= 32) {
      return [amount / 32, 'qt'];
    } else if (amount >= 16) {
      return [amount / 16, 'pt'];
    } else {
      return [amount, 'oz'];
    }
  } else {
    // Dry - keep in lbs, show tons if large
    if (amount >= 100) {
      return [amount, 'lbs'];
    } else if (amount < 1) {
      return [amount * 16, 'oz'];
    } else {
      return [amount, 'lbs'];
    }
  }
}

/**
 * Get mixing order priority for a product
 */
export function getMixingOrderPriority(product: ProductMaster): number {
  const chemicalData = product.chemicalData as ChemicalData | undefined;
  
  // Check explicit mixing order
  if (chemicalData?.mixingOrder?.priority) {
    return chemicalData.mixingOrder.priority;
  }
  
  // Try to infer from formulation type
  if (chemicalData?.formulationType) {
    const inferred = getDefaultMixingOrder(chemicalData.formulationType);
    if (inferred) return inferred.priority;
  }
  
  // Default based on category
  const category = product.category;
  if (category === 'adjuvant') return 8; // surfactants later
  if (category === 'biological') return 9; // biologicals near end
  if (category === 'fertilizer-liquid') return 7; // solutions
  if (category === 'fertilizer-dry') return 3; // dry products first
  
  return 5; // default middle
}

/**
 * Get mixing order category label
 */
export function getMixingOrderCategory(product: ProductMaster): string {
  const chemicalData = product.chemicalData as ChemicalData | undefined;
  
  if (chemicalData?.mixingOrder?.category) {
    return MIXING_ORDER_GUIDE[chemicalData.mixingOrder.category]?.description || 
           chemicalData.mixingOrder.category;
  }
  
  if (chemicalData?.formulationType) {
    const inferred = getDefaultMixingOrder(chemicalData.formulationType);
    if (inferred) {
      return MIXING_ORDER_GUIDE[inferred.category]?.description || inferred.category;
    }
  }
  
  return product.form === 'dry' ? 'Dry product' : 'Liquid product';
}

/**
 * Calculate per-load amounts for all products in a mix
 */
export function calculateLoadAmounts(
  products: TankMixProduct[],
  productMasters: ProductMaster[],
  acresPerLoad: number
): LoadCalculation[] {
  const calculations: LoadCalculation[] = [];
  
  for (const mixProduct of products) {
    const product = productMasters.find(p => p.id === mixProduct.productId);
    if (!product) continue;
    
    const form = product.form || 'liquid';
    
    // Convert rate to base units
    const basePerAcre = rateToBaseUnits(mixProduct.rate, mixProduct.unit, form);
    
    // Multiply by acres per load
    const basePerLoad = basePerAcre * acresPerLoad;
    
    // Convert to display units
    const [displayAmount, displayUnit] = baseToDisplayUnits(basePerLoad, form);
    
    calculations.push({
      productId: product.id,
      productName: product.name,
      ratePerAcre: mixProduct.rate,
      rateUnit: mixProduct.unit,
      amountPerLoad: displayAmount,
      amountUnit: displayUnit,
      form,
      mixingOrderPriority: getMixingOrderPriority(product),
      mixingOrderCategory: getMixingOrderCategory(product),
    });
  }
  
  // Sort by mixing order priority
  calculations.sort((a, b) => (a.mixingOrderPriority || 10) - (b.mixingOrderPriority || 10));
  
  return calculations;
}

/**
 * Calculate liquid product volumes in gallons per load
 * Used to determine water amount needed
 */
export function calculateLiquidVolume(
  products: TankMixProduct[],
  productMasters: ProductMaster[],
  acresPerLoad: number
): number {
  let totalOz = 0;
  
  for (const mixProduct of products) {
    const product = productMasters.find(p => p.id === mixProduct.productId);
    if (!product || product.form !== 'liquid') continue;
    
    const ozPerAcre = rateToBaseUnits(mixProduct.rate, mixProduct.unit, 'liquid');
    totalOz += ozPerAcre * acresPerLoad;
  }
  
  // Convert oz to gallons
  return totalOz / 128;
}

/**
 * Generate a complete load sheet for a mix
 */
export function generateLoadSheet(
  input: QuickMixInput,
  equipment: Equipment[],
  productMasters: ProductMaster[],
): TankLoadSheet | null {
  const equip = equipment.find(e => e.id === input.equipmentId);
  if (!equip) return null;
  
  const tankSize = equip.tankSize;
  const carrierGPA = input.carrierGPA || equip.defaultCarrierGPA || 10;
  
  // Calculate acres per load
  const acresPerLoad = tankSize / carrierGPA;
  
  // Calculate per-load amounts
  const productCalculations = calculateLoadAmounts(
    input.products,
    productMasters,
    acresPerLoad
  );
  
  // Calculate liquid product volume
  const productVolume = calculateLiquidVolume(
    input.products,
    productMasters,
    acresPerLoad
  );
  
  // Water = tank size - product volume
  const waterPerLoad = Math.max(0, tankSize - productVolume);
  
  // Calculate total loads if acres provided
  const totalLoads = input.totalAcres 
    ? Math.ceil(input.totalAcres / acresPerLoad)
    : undefined;
  
  return {
    equipmentId: equip.id,
    equipmentName: equip.name,
    tankSize,
    carrierGPA,
    acresPerLoad,
    waterPerLoad,
    products: productCalculations,
    totalLoads,
    totalAcres: input.totalAcres,
  };
}

/**
 * Format amount for display with appropriate precision
 */
export function formatLoadAmount(amount: number, unit: string): string {
  if (amount < 0.1) {
    return `${(amount * 16).toFixed(1)} oz`;
  } else if (amount < 1) {
    return `${amount.toFixed(2)} ${unit}`;
  } else if (amount < 10) {
    return `${amount.toFixed(1)} ${unit}`;
  } else {
    return `${Math.round(amount)} ${unit}`;
  }
}
