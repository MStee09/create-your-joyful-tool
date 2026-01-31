// =============================================
// SIMPLIFIED PURCHASE TYPES
// Replaces complex Order/Invoice system
// =============================================

export interface SimplePurchaseLine {
  id: string;
  productId: string;
  
  // What was purchased
  quantity: number;              // Number of packages
  packageType?: string;          // "tote", "twin-pack", "jug", "bag", "bulk"
  packageSize?: number;          // Size per package (e.g., 275 for tote)
  packageUnit?: 'gal' | 'lbs';   // Unit of package contents
  
  // Pricing
  unitPrice: number;             // Price per package
  totalPrice: number;            // quantity × unitPrice
  
  // Normalized (calculated)
  totalQuantity: number;         // Total gal or lbs
  normalizedUnit: 'gal' | 'lbs' | 'ton';
  normalizedUnitPrice: number;   // $/gal or $/lb or $/ton
  
  // Notes
  notes?: string;
}

export interface SimplePurchase {
  id: string;
  userId?: string;
  seasonId: string;
  vendorId: string;
  
  // Status
  status: 'ordered' | 'received';
  
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

// Helper to calculate normalized price
export function calculateNormalizedPrice(
  unitPrice: number,
  packageSize: number | undefined,
  packageUnit: 'gal' | 'lbs' | undefined,
  productForm: 'liquid' | 'dry'
): { normalizedPrice: number; normalizedUnit: 'gal' | 'lbs' } {
  // If no package info, price is already normalized
  if (!packageSize || !packageUnit) {
    return { 
      normalizedPrice: unitPrice, 
      normalizedUnit: productForm === 'liquid' ? 'gal' : 'lbs' 
    };
  }
  
  // Normalize to per-unit price
  const normalizedPrice = unitPrice / packageSize;
  return { normalizedPrice, normalizedUnit: packageUnit };
}

// Helper to calculate line totals
export function calculateLineTotal(line: Partial<SimplePurchaseLine>): {
  totalPrice: number;
  totalQuantity: number;
  normalizedUnitPrice: number;
} {
  const quantity = line.quantity || 0;
  const unitPrice = line.unitPrice || 0;
  const packageSize = line.packageSize || 1;
  
  const totalPrice = quantity * unitPrice;
  const totalQuantity = quantity * packageSize;
  const normalizedUnitPrice = packageSize > 0 ? unitPrice / packageSize : unitPrice;
  
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
