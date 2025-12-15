// Price Book utility functions for integrating awarded bid prices into crop cost calculations

import type { PriceBookEntry, ProductMaster, Award, CommoditySpec } from '@/types';

/**
 * Get the effective price for a product from the price book
 * Returns the awarded price if available, otherwise returns null
 */
export const getEffectivePrice = (
  productId: string,
  seasonYear: number,
  productMasters: ProductMaster[],
  priceBook: PriceBookEntry[]
): PriceBookEntry | null => {
  const product = productMasters.find(p => p.id === productId);
  if (!product) return null;
  
  // Only bid-eligible products can have price book entries
  if (!product.isBidEligible) return null;
  
  // Find price book entry for this product and season
  // First check by commoditySpecId, then by productId directly
  const entry = priceBook.find(e => 
    e.seasonYear === seasonYear && 
    (
      (product.commoditySpecId && e.specId === product.commoditySpecId) ||
      e.productId === productId
    )
  );
  
  return entry || null;
};

/**
 * Calculate the price per unit from a price book entry
 * Converts to standard units (gal or lbs) for calculations
 */
export const getPricePerUnit = (
  entry: PriceBookEntry,
  form: 'liquid' | 'dry'
): { price: number; priceUnit: 'gal' | 'lbs' | 'ton' } => {
  return {
    price: entry.price,
    priceUnit: entry.priceUom,
  };
};

/**
 * Create or update price book entries from awards
 */
export const updatePriceBookFromAwards = (
  awards: Award[],
  commoditySpecs: CommoditySpec[],
  productMasters: ProductMaster[],
  seasonYear: number,
  existingPriceBook: PriceBookEntry[]
): PriceBookEntry[] => {
  const updatedBook = [...existingPriceBook];
  
  awards.forEach(award => {
    const spec = commoditySpecs.find(s => s.id === award.specId);
    const productId = spec?.productId || award.specId; // Award specId could be productId directly
    
    // Find existing entry for this spec/product and season
    const existingIndex = updatedBook.findIndex(e => 
      e.seasonYear === seasonYear && 
      (e.specId === award.specId || e.productId === productId)
    );
    
    const newEntry: PriceBookEntry = {
      id: existingIndex >= 0 ? updatedBook[existingIndex].id : `pb-${award.id}`,
      seasonYear,
      specId: award.specId,
      productId,
      price: award.awardedPrice,
      priceUom: spec?.uom || 'ton',
      vendorId: award.vendorId,
      source: 'awarded',
    };
    
    if (existingIndex >= 0) {
      updatedBook[existingIndex] = newEntry;
    } else {
      updatedBook.push(newEntry);
    }
  });
  
  return updatedBook;
};

/**
 * Check if a product has an awarded price in the price book
 */
export const hasAwardedPrice = (
  productId: string,
  seasonYear: number,
  productMasters: ProductMaster[],
  priceBook: PriceBookEntry[]
): boolean => {
  const entry = getEffectivePrice(productId, seasonYear, productMasters, priceBook);
  return entry?.source === 'awarded';
};

/**
 * Get awarded price display info for UI
 */
export interface AwardedPriceInfo {
  isAwarded: boolean;
  price: number | null;
  priceUom: 'ton' | 'gal' | 'lbs' | null;
  vendorId: string | null;
  source: 'estimated' | 'awarded' | 'manual_override' | null;
}

export const getAwardedPriceInfo = (
  productId: string,
  seasonYear: number,
  productMasters: ProductMaster[],
  priceBook: PriceBookEntry[]
): AwardedPriceInfo => {
  const entry = getEffectivePrice(productId, seasonYear, productMasters, priceBook);
  
  if (!entry) {
    return {
      isAwarded: false,
      price: null,
      priceUom: null,
      vendorId: null,
      source: null,
    };
  }
  
  return {
    isAwarded: entry.source === 'awarded',
    price: entry.price,
    priceUom: entry.priceUom,
    vendorId: entry.vendorId || null,
    source: entry.source,
  };
};
