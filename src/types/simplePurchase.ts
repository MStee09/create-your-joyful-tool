// =============================================
// SIMPLIFIED PURCHASE TYPES
// Replaces complex Order/Invoice system
// =============================================

// Supported unit types for packages
export type PackageUnitType = 'gal' | 'lbs' | 'g' | 'oz' | 'qt' | 'pt' | 'ton';

export interface SimplePurchaseLine {
  id: string;
  productId: string;
  
  // What was purchased
  quantity: number;              // Number of packages/containers
  packageType?: string;          // "tote", "twin-pack", "jug", "bag", "bulk"
  packageSize?: number;          // Size per package (e.g., 275 gal, 1800 g)
  packageUnit?: PackageUnitType; // Unit of package contents
  
  // Pricing - PRICE IS PER UNIT ($/gal, $/lb, $/ton)
  unitPrice: number;             // Price per unit (e.g., $2.15/gal, $540/ton)
  totalPrice: number;            // totalQuantity × unitPrice (e.g., 1325 gal × $2.15 = $2848.75)
  
  // Normalized (calculated for comparison/tracking)
  totalQuantity: number;         // Total volume: quantity × packageSize (e.g., 5 × 265 = 1325 gal)
  normalizedUnit: PackageUnitType;
  normalizedUnitPrice: number;   // Same as unitPrice (already per unit)
  
  // Notes
  notes?: string;
}

export interface SimplePurchase {
  id: string;
  userId?: string;
  seasonId: string;
  vendorId: string;
  
  // Status
  status: 'booked' | 'ordered' | 'received';
  
  // Dates
  orderDate: string;             // ISO date string
  expectedDeliveryDate?: string;
  receivedDate?: string;
  
  // Line items
  lines: SimplePurchaseLine[];
  
  // Freight (tracked separately, not allocated to products)
  freightCost?: number;
  freightNotes?: string;
  
  // Totals (calculated)
  subtotal: number;              // Sum of line totals
  total: number;                 // Subtotal + freight
  
  // Notes
  notes?: string;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

// Helper type for creating new purchases
export type NewSimplePurchase = Omit<SimplePurchase, 'id' | 'createdAt' | 'updatedAt'>;
export type NewSimplePurchaseLine = Omit<SimplePurchaseLine, 'id'>;

// Helper to calculate normalized price (per-unit model — price IS already per unit)
export function calculateNormalizedPrice(
  unitPrice: number,
  packageSize: number | undefined,
  packageUnit: PackageUnitType | undefined,
  productForm: 'liquid' | 'dry'
): { normalizedPrice: number; normalizedUnit: PackageUnitType } {
  // Price is already per unit, no division needed
  if (!packageUnit) {
    return { 
      normalizedPrice: unitPrice, 
      normalizedUnit: productForm === 'liquid' ? 'gal' : 'lbs' 
    };
  }
  
  return { normalizedPrice: unitPrice, normalizedUnit: packageUnit };
}

// Helper to calculate line totals (per-unit pricing model)
export function calculateLineTotal(line: Partial<SimplePurchaseLine>): {
  totalPrice: number;
  totalQuantity: number;
  normalizedUnitPrice: number;
} {
  const quantity = line.quantity || 0;
  const unitPrice = line.unitPrice || 0;
  const packageSize = line.packageSize || 1;
  
  const totalQuantity = quantity * packageSize;
  const totalPrice = totalQuantity * unitPrice;  // Total vol × $/unit
  const normalizedUnitPrice = unitPrice;          // Already per unit
  
  return { totalPrice, totalQuantity, normalizedUnitPrice };
}

// Helper to calculate purchase totals
export function calculatePurchaseTotals(
  lines: SimplePurchaseLine[], 
  freightCost?: number
): { subtotal: number; total: number } {
  const subtotal = lines.reduce((sum, line) => sum + line.totalPrice, 0);
  const total = subtotal + (freightCost || 0);
  return { subtotal, total };
}
