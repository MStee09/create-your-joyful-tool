// Type definitions for FarmCalc

export type ProductForm = 'liquid' | 'dry';
export type LiquidUnit = 'oz' | 'qt' | 'gal';
export type DryUnit = 'oz' | 'lbs' | 'g' | 'ton';
export type RateUnit = LiquidUnit | DryUnit | 'oz/100lbs' | 'g/100lbs';

export type ProductCategory = 
  | 'biological'
  | 'micronutrient'
  | 'herbicide'
  | 'fungicide'
  | 'insecticide'
  | 'seed-treatment'
  | 'adjuvant'
  | 'fertilizer-liquid'
  | 'fertilizer-dry'
  | 'other';

export interface NutrientAnalysis {
  // Macros
  n: number;
  p: number;
  k: number;
  s: number;
  // Secondary
  ca?: number;  // Calcium
  mg?: number;  // Magnesium
  // Micros
  b?: number;   // Boron
  zn?: number;  // Zinc
  mn?: number;  // Manganese
  fe?: number;  // Iron
  cu?: number;  // Copper
  mo?: number;  // Molybdenum
  co?: number;  // Cobalt
  ni?: number;  // Nickel
  cl?: number;  // Chlorine
  // Carbon
  c?: number;   // Carbon/Organic matter
}

export interface VendorContact {
  id: string;
  name: string;
  role?: string; // "sales rep", "agronomist", "logistics"
  phone?: string;
  email?: string;
  notes?: string;
}

export interface VendorDocument {
  id: string;
  name: string;
  type: 'catalog' | 'pricing' | 'agreement' | 'other';
  data?: string; // Base64 encoded
  fileName?: string;
  url?: string;
}

export type VendorTag = 'primary-biological' | 'primary-fertility' | 'primary-crop-protection' | 'specialty' | 'local' | 'national';

export interface Vendor {
  id: string;
  name: string;
  
  // Legacy contact fields (kept for migration)
  contactEmail?: string;
  contactPhone?: string;
  
  // Enhanced contact info
  website?: string;
  contacts: VendorContact[];
  
  // Documents
  documents: VendorDocument[];
  
  // Tags & classification
  tags: VendorTag[];
  
  // Notes
  notes?: string;
  generalNotes?: string;
  freightNotes?: string; // "Freight included on totes", "Spring-only pricing"
}

// NEW: Vendor Offering - separates pricing from product master
export interface VendorOffering {
  id: string;
  productId: string;
  vendorId: string;
  
  // Pricing
  price: number;
  priceUnit: 'gal' | 'lbs' | 'ton' | 'case' | 'tote' | 'jug' | 'g' | 'bag';
  
  // Container-based pricing (for products sold by container)
  containerSize?: number;      // e.g., 500 (grams per jug)
  containerUnit?: 'g' | 'lbs' | 'gal' | 'oz';  // Unit of contents
  
  // Packaging info
  packaging?: string;  // "2.5 gal jug", "275 gal tote", "50 lb bag"
  packagingOptions?: PackagingOption[];
  sku?: string;
  
  // Terms
  lastQuotedDate?: string;
  minOrder?: string;
  freightTerms?: string;
  
  // Selection
  isPreferred: boolean;
}

// NEW: Product Master - stable product info
export interface ProductMaster {
  id: string;
  name: string;
  category: ProductCategory;
  form: ProductForm;
  defaultUnit: 'gal' | 'qt' | 'lbs' | 'ton';
  
  // Conversions
  densityLbsPerGal?: number;  // For liquids
  
  // Analysis
  analysis?: NutrientAnalysis;
  activeIngredients?: string;  // Freeform field
  
  // Notes (split)
  generalNotes?: string;
  mixingNotes?: string;
  cropRateNotes?: string;
  
  // Documents
  labelData?: string;  // Base64 PDF
  labelFileName?: string;
  sdsData?: string;    // SDS PDF
  sdsFileName?: string;
  productUrl?: string; // Manufacturer product page URL
  
  // Inventory tracking
  reorderPoint?: number;
  reorderUnit?: 'gal' | 'lbs';
  
  // Procurement classification
  productType?: ProductType;  // commodity | specialty
  isBidEligible?: boolean;
  commoditySpecId?: string;   // Link to commodity spec if commodity
  
  // Estimated pricing for non-bid products
  estimatedPrice?: number;
  estimatedPriceUnit?: 'gal' | 'lbs' | 'ton';
}

// LEGACY: Old Product interface for migration
export interface Product {
  id: string;
  vendorId: string;
  name: string;
  price: number;
  priceUnit: 'gal' | 'lbs' | 'ton' | 'jug' | 'bag' | 'case' | 'tote' | 'g';
  form: ProductForm;
  analysis?: NutrientAnalysis;
  densityLbsPerGal?: number;
  notes?: string;
  labelData?: string;
  labelFileName?: string;
  // Container-based pricing
  containerSize?: number;      // e.g., 1800 (grams per jug)
  containerUnit?: 'g' | 'lbs' | 'gal' | 'oz';  // Unit of contents
}

export interface Tier {
  id: string;
  name: string;
  percentage: number;
}

export interface ApplicationTiming {
  id: string;
  name: string;
  order: number;
}

export type TierLabel = 'core' | 'selective' | 'trial';

export interface Application {
  id: string;
  timingId: string;
  productId: string;
  rate: number;
  rateUnit: RateUnit;
  tierId?: string; // Deprecated - kept for backward compatibility
  acresPercentage?: number; // 0-100
  tierAuto?: TierLabel;
  tierOverride?: TierLabel;
  role?: string;
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

// Packaging option for container-based inventory
export interface PackagingOption {
  id: string;
  productId: string;
  vendorId?: string;
  name: string;        // "Tote", "Drum", "Jug", "Twin-Pack"
  unitSize: number;    // 275, 30, 2.5
  unitType: 'gal' | 'lbs';
  isDefault?: boolean;
}

// Enhanced inventory with lot tracking and container support
export interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  unit: 'gal' | 'lbs';
  
  // Container-based tracking
  packagingName?: string;      // "Drum", "Tote", etc.
  packagingSize?: number;      // Size per container
  containerCount?: number;     // Number of containers
  
  // Lot tracking (optional)
  lotNumber?: string;
  location?: string;  // "Shop", "Shed", "Tender trailer"
  receivedDate?: string;
  expirationDate?: string;
}

// NEW: App state with both old and new structure support
export interface AppState {
  seasons: Season[];
  products: Product[];  // Legacy - kept for migration
  productMasters: ProductMaster[];  // New structure
  vendorOfferings: VendorOffering[];  // New structure
  vendors: Vendor[];
  inventory: InventoryItem[];
  currentSeasonId: string | null;
  currentCropId: string | null;
  dataVersion?: number;  // For migration tracking
  // Procurement system
  commoditySpecs: CommoditySpec[];
  bidEvents: BidEvent[];
  vendorQuotes: VendorQuote[];
  awards: Award[];
  priceBook: PriceBookEntry[];
}

export interface NutrientSummary {
  n: number;
  p: number;
  k: number;
  s: number;
}

export interface CropCosts {
  totalCost: number;
  costPerAcre: number;
  timingCosts: Record<string, number>;
  seedTreatmentCost: number;
}

// Helper type for product with preferred vendor info
export interface ProductWithVendor extends ProductMaster {
  preferredOffering?: VendorOffering;
  preferredVendor?: Vendor;
  totalOnHand?: number;
  stockStatus?: 'ok' | 'low' | 'out';
}

// ============================================================================
// PROCUREMENT SYSTEM TYPES
// ============================================================================

// Product classification for bidding
export type ProductType = 'commodity' | 'specialty';

// Commodity spec - canonical definition for bidding
export interface CommoditySpec {
  id: string;
  productId?: string;          // Links to ProductMaster
  name: string;                // "AMS 21-0-0-24S", "Glyphosate 4lb ae"
  specName?: string;           // Legacy alias
  description?: string;        // Detailed description
  analysis?: NutrientAnalysis | string;  // Optional analysis
  unit: 'ton' | 'gal' | 'lbs';
  uom?: 'ton' | 'gal' | 'lbs'; // Legacy alias
  category?: 'fertilizer' | 'chemical' | string;
}

// Bid event types
export type BidEventType = 'SPRING_DRY' | 'SPRING_CHEM' | 'FALL_DRY' | 'CUSTOM';
export type BidEventStatus = 'draft' | 'sent' | 'collecting' | 'awarded' | 'locked';

// Vendor invitation status for manual tracking
export type VendorInvitationStatus = 'pending' | 'sent' | 'responded' | 'declined' | 'no_response';

export interface VendorInvitation {
  vendorId: string;
  status: VendorInvitationStatus;
  sentDate?: string;
  responseDate?: string;
  notes?: string;
}

export interface BidEvent {
  id: string;
  seasonId?: string;
  seasonYear?: number;
  eventType?: BidEventType;
  name: string;               // "2026 Spring Dry Fert Bid"
  status: BidEventStatus;
  dueDate?: string;
  invitedVendorIds: string[];
  vendorInvitations?: VendorInvitation[];  // Manual tracking of invitation status
  notes?: string;
  createdAt?: Date | string;
}

// Demand rollup - auto-calculated from crop plans
export interface DemandRollup {
  specId: string;
  productId: string;
  productName: string;
  specName: string;
  plannedQty: number;
  uom: 'ton' | 'gal' | 'lbs';
  cropBreakdown: Array<{ cropName: string; qty: number }>;
}

// Vendor quote
export interface VendorQuote {
  id: string;
  bidEventId: string;
  vendorId: string;
  specId?: string;
  commoditySpecId: string;
  price: number;
  priceUom?: 'ton' | 'gal' | 'lbs';
  deliveryTerms?: string;
  minQty?: number;
  maxQty?: number;
  isDeliveredIncluded?: boolean;
  validUntil?: string;
  notes?: string;
}

// Award (supports split awards)
export interface Award {
  id: string;
  bidEventId: string;
  vendorQuoteId: string;
  specId?: string;
  vendorId?: string;
  quantity: number;
  awardedQty?: number;        // Legacy alias
  awardedPrice?: number;
  effectiveDate?: string;
  notes?: string;
}

// Price book - what crop plans read
export interface PriceBookEntry {
  id: string;
  seasonId?: string;
  seasonYear?: number;
  commoditySpecId?: string;
  specId?: string;
  productId?: string;
  vendorId?: string;
  price: number;
  unit?: 'ton' | 'gal' | 'lbs';
  priceUom?: 'ton' | 'gal' | 'lbs';
  source?: 'estimated' | 'awarded' | 'manual' | 'manual_override';
  effectiveDate?: string;
  notes?: string;
}

// Re-export purchase types from farm.ts
export type { 
  Purchase, 
  PurchaseLineItem, 
  InventoryTransaction, 
  AdjustmentReason,
  PriceHistory as PriceHistoryRecord,
  ProductExtended,
  PackageOptionUI,
  ProductUsage,
  ProductInventoryStatus,
  SeasonPurchaseSummary,
  PriceComparison,
} from './types/farm';

// Re-export order/invoice types
export type {
  Order,
  OrderLineItem,
  OrderStatus,
  PaymentStatus,
  Invoice,
  InvoiceLineItem,
  InvoiceCharge,
  InvoiceStatus,
  ChargeType,
} from './types/orderInvoice';
