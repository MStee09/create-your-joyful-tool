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
  // New comprehension-first fields
  acresPercentage?: number; // 0-100, replaces tier dependency
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

export interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  unit: 'gal' | 'lbs';
}

export interface AppState {
  seasons: Season[];
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  currentSeasonId: string | null;
  currentCropId: string | null;
}
