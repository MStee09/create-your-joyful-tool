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
  n: number;
  p: number;
  k: number;
  s: number;
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
  priceUnit: 'gal' | 'lbs' | 'ton' | 'case' | 'tote';
  
  // Packaging info
  packaging?: string;  // "2.5 gal jug", "275 gal tote", "50 lb bag"
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
  
  // Inventory tracking
  reorderPoint?: number;
  reorderUnit?: 'gal' | 'lbs';
}

// LEGACY: Old Product interface for migration
export interface Product {
  id: string;
  vendorId: string;
  name: string;
  price: number;
  priceUnit: 'gal' | 'lbs' | 'ton';
  form: ProductForm;
  analysis?: NutrientAnalysis;
  densityLbsPerGal?: number;
  notes?: string;
  labelData?: string;
  labelFileName?: string;
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

export interface Application {
  id: string;
  timingId: string;
  productId: string;
  rate: number;
  rateUnit: RateUnit;
  tierId: string;
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

// Enhanced inventory with lot tracking
export interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  unit: 'gal' | 'lbs';
  
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
