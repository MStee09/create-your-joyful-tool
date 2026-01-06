import type { VendorOffering, Vendor, Product } from '../types';
import type { PlannedUsageItem } from './calculations';

export interface VendorProductSpend {
  productId: string;
  productName: string;
  quantityNeeded: number;
  unit: string;
  pricePerUnit: number;
  priceUnit: string;
  extendedCost: number;
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
 * Calculate vendor spending from planned usage
 * Maps planned product needs to preferred vendor offerings to calculate spending
 */
export const calculateVendorSpending = (
  plannedUsage: PlannedUsageItem[],
  products: Product[],
  vendorOfferings: VendorOffering[],
  vendors: Vendor[]
): { vendorSpending: VendorSpendSummary[]; totals: SpendingSummaryTotals } => {
  const vendorMap = new Map<string, VendorSpendSummary>();
  const unassignedProducts: VendorProductSpend[] = [];
  
  plannedUsage.forEach(usage => {
    const product = products.find(p => p.id === usage.productId);
    if (!product) return;
    
    // Find preferred offering for this product
    const offerings = vendorOfferings.filter(o => o.productId === usage.productId);
    const preferredOffering = offerings.find(o => o.isPreferred) || offerings[0];
    
    // Calculate extended cost
    let extendedCost = 0;
    let pricePerUnit = 0;
    let priceUnit = '';
    
    if (preferredOffering) {
      pricePerUnit = preferredOffering.price;
      priceUnit = preferredOffering.priceUnit;
      
      // Handle container-based pricing
      if (['jug', 'bag', 'case', 'tote'].includes(preferredOffering.priceUnit)) {
        // Quantity is already in container units from calculatePlannedUsage
        extendedCost = usage.totalNeeded * preferredOffering.price;
      } else {
        // Direct unit pricing (gal, lbs, ton)
        if (preferredOffering.priceUnit === 'ton' && usage.unit === 'lbs') {
          // Convert lbs to tons for pricing
          extendedCost = (usage.totalNeeded / 2000) * preferredOffering.price;
        } else {
          extendedCost = usage.totalNeeded * preferredOffering.price;
        }
      }
      
      const vendor = vendors.find(v => v.id === preferredOffering.vendorId);
      if (vendor) {
        if (!vendorMap.has(vendor.id)) {
          vendorMap.set(vendor.id, {
            vendorId: vendor.id,
            vendorName: vendor.name,
            totalSpend: 0,
            productBreakdown: [],
          });
        }
        
        const vendorSummary = vendorMap.get(vendor.id)!;
        vendorSummary.totalSpend += extendedCost;
        vendorSummary.productBreakdown.push({
          productId: product.id,
          productName: product.name,
          quantityNeeded: usage.totalNeeded,
          unit: usage.unit,
          pricePerUnit,
          priceUnit,
          extendedCost,
        });
      }
    } else {
      // No vendor offering found - use product's estimated price if available
      const estimatedPrice = product.price || 0;
      pricePerUnit = estimatedPrice;
      priceUnit = product.priceUnit || usage.unit;
      
      // Handle container-based pricing for estimated
      if (['jug', 'bag', 'case', 'tote'].includes(product.priceUnit || '')) {
        extendedCost = usage.totalNeeded * estimatedPrice;
      } else {
        extendedCost = usage.totalNeeded * estimatedPrice;
      }
      
      unassignedProducts.push({
        productId: product.id,
        productName: product.name,
        quantityNeeded: usage.totalNeeded,
        unit: usage.unit,
        pricePerUnit,
        priceUnit,
        extendedCost,
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
    'Vendor,Product,Quantity,Unit,Price/Unit,Price Unit,Extended Cost',
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
      ].join(','));
    });
    // Vendor total row
    lines.push([
      '',
      '"VENDOR TOTAL"',
      '',
      '',
      '',
      '',
      vendor.totalSpend.toFixed(2),
    ].join(','));
    lines.push('');
  });
  
  // Unassigned products
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
      ].join(','));
    });
  }
  
  return lines.join('\n');
};
