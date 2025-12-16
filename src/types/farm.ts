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
  priceUnit: 'gal' | 'lbs' | 'ton';
  form: ProductForm;
  analysis?: NutrientAnalysis;
  densityLbsPerGal?: number;
  notes?: string;
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

export interface AppState {
  seasons: Season[];
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  currentSeasonId: string | null;
  currentCropId: string | null;
}
