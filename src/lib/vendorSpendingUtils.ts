import type { VendorOffering, Vendor, Product } from '../types';
import type { PlannedUsageItem } from './calculations';
import type { SimplePurchase } from '../types/simplePurchase';
import { convertPurchaseLineToBaseUnit } from './cropCalculations';

export interface VendorProductSpend {
  productId: string;
  productName: string;
  quantityNeeded: number;
  unit: string;
  pricePerUnit: number;
  priceUnit: string;
  extendedCost: number;
  source: 'purchase' | 'projected';
}

export interface VendorSpendSummary {
  vendorId: string;
  vendorName: string;
  totalSpend: number;
  productBreakdown: VendorProductSpend[];
}

export interface SpendingSummaryTotals {
  totalSeasonSpend: number;
  vendorCount: number;
  largestVendorSpend: number;
  largestVendorName: string;
  unassignedSpend: number;
  unassignedProducts: VendorProductSpend[];
}

/**
 * Calculate vendor spending from actual purchases (booked/ordered/received)
 * and fill remaining demand with projected spending from vendor offerings
 */
export const calculateVendorSpending = (
  plannedUsage: PlannedUsageItem[],
  products: Product[],
  vendorOfferings: VendorOffering[],
  vendors: Vendor[],
  purchases: SimplePurchase[] = []
): { vendorSpending: VendorSpendSummary[]; totals: SpendingSummaryTotals } => {
  const vendorMap = new Map<string, VendorSpendSummary>();
  const unassignedProducts: VendorProductSpend[] = [];

  const getOrCreateVendor = (vendorId: string, vendorName: string): VendorSpendSummary => {
    if (!vendorMap.has(vendorId)) {
      vendorMap.set(vendorId, {
        vendorId,
        vendorName,
        totalSpend: 0,
        productBreakdown: [],
      });
    }
    return vendorMap.get(vendorId)!;
  };

  // Step 1: Aggregate actual purchase spending by vendor × product
  // Track purchased quantities per product (in planned-usage units) to subtract from demand
  const purchasedByProduct = new Map<string, number>(); // productId → qty in planned units

  purchases.forEach(purchase => {
    const vendor = vendors.find(v => v.id === purchase.vendorId);
    if (!vendor) return;

    purchase.lines.forEach(line => {
      const product = products.find(p => p.id === line.productId);
      if (!product) return;

      const vendorSummary = getOrCreateVendor(vendor.id, vendor.name);

      // Use the actual purchase total price
      vendorSummary.totalSpend += line.totalPrice;
      vendorSummary.productBreakdown.push({
        productId: product.id,
        productName: product.name,
        quantityNeeded: line.quantity,
        unit: line.packageType || line.normalizedUnit || 'units',
        pricePerUnit: line.unitPrice,
        priceUnit: line.packageType || line.normalizedUnit || 'units',
        extendedCost: line.totalPrice,
        source: 'purchase',
      });

      // Track purchased qty in planned-usage units
      // For container-based products, plannedUsage uses container count
      const isContainer = ['jug', 'bag', 'case', 'tote'].includes(line.packageType || '');
      const qtyInPlannedUnits = isContainer ? line.quantity : line.totalQuantity;
      const prev = purchasedByProduct.get(product.id) || 0;
      purchasedByProduct.set(product.id, prev + qtyInPlannedUnits);
    });
  });

  // Step 2: For remaining demand not covered by purchases, project from vendor offerings
  plannedUsage.forEach(usage => {
    const product = products.find(p => p.id === usage.productId);
    if (!product) return;

    const purchasedQty = purchasedByProduct.get(usage.productId) || 0;
    const remainingNeed = Math.max(0, usage.totalNeeded - purchasedQty);

    if (remainingNeed <= 0) return; // Fully covered by purchases

    const offerings = vendorOfferings.filter(o => o.productId === usage.productId);
    const preferredOffering = offerings.find(o => o.isPreferred);

    let extendedCost = 0;
    let pricePerUnit = 0;
    let priceUnit = '';

    if (preferredOffering) {
      // Use offering price, but fall back to product price if offering has no quote yet
      const effectivePrice = preferredOffering.price > 0 
        ? preferredOffering.price 
        : (product.price || 0);
      const effectivePriceUnit = preferredOffering.price > 0
        ? preferredOffering.priceUnit
        : (product.priceUnit || usage.unit);

      pricePerUnit = effectivePrice;
      priceUnit = effectivePriceUnit;

      if (['jug', 'bag', 'case', 'tote'].includes(effectivePriceUnit)) {
        extendedCost = remainingNeed * effectivePrice;
      } else {
        if (effectivePriceUnit === 'ton' && usage.unit === 'lbs') {
          extendedCost = (remainingNeed / 2000) * effectivePrice;
        } else {
          extendedCost = remainingNeed * effectivePrice;
        }
      }

      const vendor = vendors.find(v => v.id === preferredOffering.vendorId);
      if (vendor) {
        const vendorSummary = getOrCreateVendor(vendor.id, vendor.name);
        vendorSummary.totalSpend += extendedCost;
        vendorSummary.productBreakdown.push({
          productId: product.id,
          productName: product.name,
          quantityNeeded: remainingNeed,
          unit: usage.unit,
          pricePerUnit,
          priceUnit,
          extendedCost,
          source: 'projected',
        });
      }
    } else {
      const estimatedPrice = product.price || 0;
      pricePerUnit = estimatedPrice;
      priceUnit = product.priceUnit || usage.unit;

      extendedCost = remainingNeed * estimatedPrice;

      unassignedProducts.push({
        productId: product.id,
        productName: product.name,
        quantityNeeded: remainingNeed,
        unit: usage.unit,
        pricePerUnit,
        priceUnit,
        extendedCost,
        source: 'projected',
      });
    }
  });

  // Sort vendors by total spend (highest first)
  const vendorSpending = Array.from(vendorMap.values())
    .sort((a, b) => b.totalSpend - a.totalSpend);

  // Calculate totals
  const totalSeasonSpend = vendorSpending.reduce((sum, v) => sum + v.totalSpend, 0)
    + unassignedProducts.reduce((sum, p) => sum + p.extendedCost, 0);
  const unassignedSpend = unassignedProducts.reduce((sum, p) => sum + p.extendedCost, 0);

  const largestVendor = vendorSpending[0];

  return {
    vendorSpending,
    totals: {
      totalSeasonSpend,
      vendorCount: vendorSpending.length,
      largestVendorSpend: largestVendor?.totalSpend || 0,
      largestVendorName: largestVendor?.vendorName || '',
      unassignedSpend,
      unassignedProducts,
    },
  };
};

/**
 * Format currency for display
 */
export const formatSpendCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Generate CSV for vendor spending export
 */
export const generateVendorSpendCSV = (
  vendorSpending: VendorSpendSummary[],
  totals: SpendingSummaryTotals,
  seasonYear: number
): string => {
  const lines: string[] = [
    `# ${seasonYear} Vendor Spending Summary`,
    `# Total Season Spend: ${formatSpendCurrency(totals.totalSeasonSpend)}`,
    '',
    'Vendor,Product,Quantity,Unit,Price/Unit,Price Unit,Extended Cost,Source',
  ];

  vendorSpending.forEach(vendor => {
    vendor.productBreakdown.forEach((product, idx) => {
      const vendorName = idx === 0 ? `"${vendor.vendorName}"` : '';
      lines.push([
        vendorName,
        `"${product.productName}"`,
        product.quantityNeeded.toFixed(2),
        product.unit,
        product.pricePerUnit.toFixed(2),
        product.priceUnit,
        product.extendedCost.toFixed(2),
        product.source,
      ].join(','));
    });
    lines.push([
      '',
      '"VENDOR TOTAL"',
      '',
      '',
      '',
      '',
      vendor.totalSpend.toFixed(2),
      '',
    ].join(','));
    lines.push('');
  });

  if (totals.unassignedProducts.length > 0) {
    lines.push('"No Vendor Assigned"');
    totals.unassignedProducts.forEach(product => {
      lines.push([
        '',
        `"${product.productName}"`,
        product.quantityNeeded.toFixed(2),
        product.unit,
        product.pricePerUnit.toFixed(2),
        product.priceUnit,
        product.extendedCost.toFixed(2),
        product.source,
      ].join(','));
    });
  }

  return lines.join('\n');
};
