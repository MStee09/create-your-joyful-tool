export type ProductForm = 'liquid' | 'dry';
export type LiquidUnit = 'oz' | 'qt' | 'gal';
export type DryUnit = 'oz' | 'lbs' | 'g' | 'ton';
export type RateUnit = LiquidUnit | DryUnit | 'oz/100lbs' | 'g/100lbs';

export interface NutrientAnalysis {
  n: number;
  p: number;
  k: number;
  s: number;
}

export interface Vendor {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  price: number;
  priceUnit: 'gal' | 'lbs' | 'ton' | 'jug' | 'bag' | 'case' | 'g';
  form: ProductForm;
  analysis?: NutrientAnalysis;
  densityLbsPerGal?: number;
  notes?: string;
  // Container-based pricing
  containerSize?: number;      // e.g., 1800 (grams per jug)
  containerUnit?: 'g' | 'lbs' | 'gal' | 'oz';  // Unit of contents
}

export interface Tier {
  id: string;
  name: string;
  percentage: number;
}

export type TimingBucket = 'PRE_PLANT' | 'AT_PLANTING' | 'IN_SEASON' | 'POST_HARVEST';
export type CropType = 'corn' | 'soybeans' | 'wheat' | 'small_grains' | 'edible_beans' | 'other';
export type TierLabel = 'core' | 'selective' | 'trial';

export interface ApplicationTiming {
  id: string;
  name: string;
  order: number;
  // Timing metadata
  timingBucket?: TimingBucket;
  growthStageStart?: string;
  growthStageEnd?: string;
}

export interface Application {
  id: string;
  timingId: string;
  productId: string;
  rate: number;
  rateUnit: RateUnit;
  tierId?: string; // Deprecated - kept for backward compatibility
  // Acres-based fields
  acresPercentage?: number; // 0-100 (defaults to 100 if missing)
  // Auto-tier system
  tierAuto?: TierLabel;      // Auto-calculated from acresPercentage
  tierOverride?: TierLabel;  // User override (nullable)
  role?: string; // e.g., "Biology / Carbon", "Stress mitigation"
}

export interface SeedTreatment {
  id: string;
  productId: string;
  ratePerCwt: number;
  rateUnit: 'oz' | 'g';
  plantingRateLbsPerAcre: number;
}

export interface Crop {
  id: string;
  name: string;
  cropType?: CropType;
  totalAcres: number;
  tiers: Tier[];
  applicationTimings: ApplicationTiming[];
  applications: Application[];
  seedTreatments: SeedTreatment[];
}

export interface Season {
  id: string;
  year: number;
  name: string;
  crops: Crop[];
  createdAt: Date;
}

export interface PackagingOption {
  id: string;
  productId: string;
  vendorId?: string;
  name: string;        // "Tote", "Drum", "Jug", "Twin-Pack"
  unitSize: number;    // 275, 30, 2.5
  unitType: 'gal' | 'lbs';
  isDefault?: boolean;
}

export interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  unit: 'gal' | 'lbs';
  // Container-based tracking
  packagingName?: string;      // "Drum", "Tote", etc.
  packagingSize?: number;      // Size per container
  containerCount?: number;     // Number of containers
}

// ============================================
// PURCHASE & INVENTORY TRACKING TYPES
// ============================================

/**
 * Represents a purchase order/receipt
 */
export interface Purchase {
  id: string;
  date: string;                    // ISO date string
  vendorId: string;
  seasonYear: number;              // 2025, 2026, etc.
  status: 'ordered' | 'received' | 'partial';
  invoiceNumber?: string;
  notes?: string;
  lineItems: PurchaseLineItem[];
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual line item within a purchase
 */
export interface PurchaseLineItem {
  id: string;
  productId: string;
  quantity: number;                // Total quantity in base units (gal, lbs, etc.)
  unit: string;                    // Base unit: 'gal', 'lb', 'oz', etc.
  packageType?: string;            // '2.5 gal jug', '275 gal tote', etc.
  packageQuantity?: number;        // Number of packages
  unitPrice: number;               // Price per base unit
  totalPrice: number;              // quantity * unitPrice
  receivedQuantity?: number;       // For partial receipts
}

/**
 * Tracks all inventory movements (in and out)
 */
export interface InventoryTransaction {
  id: string;
  date: string;
  productId: string;
  type: 'purchase' | 'application' | 'adjustment' | 'return' | 'carryover';
  quantity: number;                // Positive for in, negative for out
  unit: string;
  referenceId?: string;            // Links to purchaseId or applicationId
  referenceType?: 'purchase' | 'application' | 'adjustment';
  seasonYear: number;
  notes?: string;
  unitCost?: number;               // For cost tracking (FIFO/weighted avg)
  createdAt: string;
}

/**
 * Adjustment reasons for non-purchase inventory additions
 */
export type AdjustmentReason = 'carryover' | 'transfer' | 'correction' | 'sample' | 'return';

/**
 * Tracks historical pricing for products
 */
export interface PriceHistory {
  id: string;
  productId: string;
  vendorId: string;
  date: string;
  unitPrice: number;
  unit: string;
  seasonYear: number;
  purchaseId?: string;             // Links back to the purchase
}

/**
 * Extended Product type with commodity classification
 */
export interface ProductExtended extends Product {
  productType: 'specialty' | 'commodity';
  commodityClass?: 'dry_fertilizer' | 'chemical' | 'seed' | 'other';
  defaultVendorId?: string;        // For specialty products
}

// ============================================
// HELPER TYPES FOR UI
// ============================================

/**
 * Package option for inventory entry
 */
export interface PackageOptionUI {
  label: string;                   // "2.5 gal jug"
  size: number;                    // 2.5
  unit: string;                    // "gal"
}

/**
 * Product usage info (where a product is used in plans)
 */
export interface ProductUsage {
  cropId: string;
  cropName: string;
  timingId: string;
  timingName: string;
  quantityNeeded: number;
  unit: string;
}

/**
 * Inventory status for a product
 */
export interface ProductInventoryStatus {
  productId: string;
  productName: string;
  vendorId: string;
  vendorName: string;
  onHand: number;
  unit: string;
  planNeeds: number;
  shortage: number;                // planNeeds - onHand (0 if sufficient)
  surplus: number;                 // onHand - planNeeds (0 if short)
  status: 'short' | 'ok' | 'surplus';
  usedIn: ProductUsage[];
  lastPurchasePrice?: number;
  lastPurchaseDate?: string;
  inventoryValue: number;          // onHand * avgCost
}

// ============================================
// SEASON/YEAR TYPES
// ============================================

/**
 * Season summary with purchase tracking
 */
export interface SeasonPurchaseSummary {
  seasonYear: number;
  totalPurchased: number;          // Dollar amount
  totalBudget?: number;
  purchaseCount: number;
  byCategory: {
    specialty: number;
    dryFertilizer: number;
    chemicals: number;
    other: number;
  };
  byVendor: {
    vendorId: string;
    vendorName: string;
    totalSpent: number;
  }[];
}

/**
 * Price comparison across years
 */
export interface PriceComparison {
  productId: string;
  productName: string;
  unit: string;
  prices: {
    year: number;
    price: number;
    vendorId: string;
    vendorName: string;
    date: string;
  }[];
  trend: 'up' | 'down' | 'stable';
  percentChange: number;           // Year-over-year
}

export interface AppState {
  seasons: Season[];
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  purchases: Purchase[];
  inventoryTransactions: InventoryTransaction[];
  priceHistory: PriceHistory[];
  currentSeasonId: string | null;
  currentCropId: string | null;
}
