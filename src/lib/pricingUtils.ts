// ============================================================================
// Pricing Utilities
// Handles effective pricing, plan eligibility, and pricing status display
// ============================================================================

import type { ProductMaster, VendorOffering, Vendor } from '@/types';

/**
 * Effective price result showing the best available price for a product
 */
export interface EffectivePrice {
  price: number;
  unit: string;
  source: 'vendor' | 'estimated';
  vendorId?: string;
  vendorName?: string;
}

/**
 * Pricing status for UI display
 */
export type PricingStatus = 'vendor' | 'estimated' | 'none';

/**
 * Get the effective price for a product following the pricing hierarchy:
 * 1. Lowest vendor offering price (if any)
 * 2. Product estimatedPrice (fallback)
 * 3. null (no price available)
 */
export function getEffectivePrice(
  product: ProductMaster,
  vendorOfferings: VendorOffering[],
  vendors: Vendor[]
): EffectivePrice | null {
  // 1. Get offerings for this product with valid prices
  const offerings = vendorOfferings
    .filter(o => o.productId === product.id && o.price > 0)
    .sort((a, b) => a.price - b.price); // Sort by price ascending

  // 2. Lowest vendor price wins
  if (offerings.length > 0) {
    const lowest = offerings[0];
    const vendor = vendors.find(v => v.id === lowest.vendorId);
    return {
      price: lowest.price,
      unit: lowest.priceUnit || (product.form === 'liquid' ? 'gal' : 'lbs'),
      source: 'vendor',
      vendorId: lowest.vendorId,
      vendorName: vendor?.name,
    };
  }

  // 3. Fall back to estimated price
  if (product.estimatedPrice && product.estimatedPrice > 0) {
    return {
      price: product.estimatedPrice,
      unit: product.estimatedPriceUnit || product.defaultUnit || (product.form === 'liquid' ? 'gal' : 'lbs'),
      source: 'estimated',
    };
  }

  return null;
}

/**
 * Check if a product can be added to a crop plan
 * Products must have either a vendor price OR an estimated price
 */
export function canAddToPlan(
  product: ProductMaster,
  vendorOfferings: VendorOffering[]
): boolean {
  // Check for vendor offerings with valid prices
  const hasVendorPrice = vendorOfferings.some(
    o => o.productId === product.id && o.price > 0
  );

  // Check for estimated price
  const hasEstimatedPrice = 
    product.estimatedPrice !== undefined && 
    product.estimatedPrice !== null && 
    product.estimatedPrice > 0;

  return hasVendorPrice || hasEstimatedPrice;
}

/**
 * Get pricing status for UI display
 * Returns indicator for styling and messaging
 */
export function getPricingStatus(
  product: ProductMaster,
  vendorOfferings: VendorOffering[]
): PricingStatus {
  // Check for vendor offerings with valid prices
  const hasVendorPrice = vendorOfferings.some(
    o => o.productId === product.id && o.price > 0
  );

  if (hasVendorPrice) {
    return 'vendor';
  }

  // Check for estimated price
  const hasEstimatedPrice = 
    product.estimatedPrice !== undefined && 
    product.estimatedPrice !== null && 
    product.estimatedPrice > 0;

  if (hasEstimatedPrice) {
    return 'estimated';
  }

  return 'none';
}

/**
 * Find the lowest-priced offering for a product
 */
export function getLowestOffering(
  productId: string,
  vendorOfferings: VendorOffering[]
): VendorOffering | null {
  const offerings = vendorOfferings
    .filter(o => o.productId === productId && o.price > 0)
    .sort((a, b) => a.price - b.price);

  return offerings[0] || null;
}

/**
 * Check if an offering is the lowest-priced for its product
 */
export function isLowestPrice(
  offering: VendorOffering,
  vendorOfferings: VendorOffering[]
): boolean {
  const lowest = getLowestOffering(offering.productId, vendorOfferings);
  return lowest?.id === offering.id;
}

/**
 * Format price display with source indicator
 * Returns formatted string like "$148/gal" or "$150/gal (est)"
 */
export function formatEffectivePriceDisplay(effectivePrice: EffectivePrice | null): string {
  if (!effectivePrice) {
    return 'No price';
  }

  const priceStr = `$${effectivePrice.price.toFixed(2)}/${effectivePrice.unit}`;
  
  if (effectivePrice.source === 'estimated') {
    return `${priceStr} (est)`;
  }

  return priceStr;
}
