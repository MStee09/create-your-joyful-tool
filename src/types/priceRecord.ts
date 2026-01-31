// =============================================
// PRICE RECORD TYPES
// Tracks all prices over time (quotes and purchases)
// =============================================

export interface PriceRecord {
  id: string;
  userId?: string;
  productId: string;
  vendorId: string;
  
  // Price information
  price: number;                 // Price as quoted/paid
  unit: 'gal' | 'lbs' | 'ton';  // Unit for the price
  normalizedPrice: number;       // Calculated $/base unit
  
  // Package information (for normalization context)
  packageType?: string;          // "tote", "twin-pack", "jug", etc.
  packageSize?: number;          // e.g., 275 (gal per tote)
  packageUnit?: 'gal' | 'lbs';   // Unit of package contents
  quantityPurchased?: number;    // How many packages (if purchased)
  
  // Timing
  date: string;                  // ISO date - when quoted or purchased
  seasonYear: number;            // Which crop year this is for
  
  // Classification
  type: 'quote' | 'purchased';   // Was this just a quote or actual purchase?
  
  // Linkage
  purchaseId?: string;           // If type='purchased', links to Purchase
  
  // Notes
  notes?: string;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

// Helper type for creating new price records
export type NewPriceRecord = Omit<PriceRecord, 'id' | 'createdAt' | 'updatedAt'>;

// Baseline price info (calculated from price records)
export interface BaselinePrice {
  price: number;
  unit: 'gal' | 'lbs' | 'ton';
  date: string;
  vendorId: string;
  packageType?: string;
}

// Helper to calculate baseline price from records
export function calculateBaselinePrice(
  productId: string,
  priceRecords: PriceRecord[]
): BaselinePrice | null {
  // Filter to this product, type='purchased', with package info
  const purchased = priceRecords
    .filter(r => 
      r.productId === productId && 
      r.type === 'purchased' &&
      r.packageType
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Find most recent bulk/tote purchase
  const bulkTypes = ['tote', 'bulk', 'drum', 'tank'];
  const bulkPurchase = purchased.find(r => 
    bulkTypes.includes(r.packageType?.toLowerCase() || '')
  );
  
  if (bulkPurchase) {
    return {
      price: bulkPurchase.normalizedPrice,
      unit: bulkPurchase.unit,
      date: bulkPurchase.date,
      vendorId: bulkPurchase.vendorId,
      packageType: bulkPurchase.packageType,
    };
  }
  
  // Fallback to most recent purchase if no bulk
  if (purchased.length > 0) {
    const recent = purchased[0];
    return {
      price: recent.normalizedPrice,
      unit: recent.unit,
      date: recent.date,
      vendorId: recent.vendorId,
      packageType: recent.packageType,
    };
  }
  
  return null;
}

// Helper to get price for a specific year
export function getPriceForYear(
  productId: string, 
  year: number, 
  records: PriceRecord[]
): number | null {
  const yearRecords = records
    .filter(r => r.productId === productId && r.seasonYear === year && r.type === 'purchased')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return yearRecords[0]?.normalizedPrice ?? null;
}

// Helper to calculate year-over-year change
export function calculatePriceChange(
  productId: string, 
  records: PriceRecord[], 
  currentYear: number,
  yearsBack: number = 3
): { amount: number; percent: number } | null {
  const currentPrice = getPriceForYear(productId, currentYear, records);
  const pastPrice = getPriceForYear(productId, currentYear - yearsBack, records);
  
  if (currentPrice === null || pastPrice === null || pastPrice === 0) return null;
  
  const amount = currentPrice - pastPrice;
  const percent = ((currentPrice - pastPrice) / pastPrice) * 100;
  
  return { amount, percent };
}
