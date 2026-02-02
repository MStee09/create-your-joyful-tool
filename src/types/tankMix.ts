// ============================================================================
// Tank Mix Recipe Types
// For saved mix recipes with per-load calculations
// ============================================================================

export interface TankMixProduct {
  productId: string;
  rate: number;
  unit: string; // oz/ac, pt/ac, qt/ac, gal/ac, lbs/ac, etc.
}

export interface TankMixRecipe {
  id: string;
  name: string;
  description?: string;
  carrierGPA: number; // gallons per acre of water
  products: TankMixProduct[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Per-load calculation result
export interface LoadCalculation {
  productId: string;
  productName: string;
  ratePerAcre: number;
  rateUnit: string;
  amountPerLoad: number;
  amountUnit: string; // converted to practical units (oz, pt, qt, gal, lbs)
  form: 'liquid' | 'dry';
  mixingOrderPriority?: number;
  mixingOrderCategory?: string;
}

export interface TankLoadSheet {
  equipmentId: string;
  equipmentName: string;
  tankSize: number;
  carrierGPA: number;
  acresPerLoad: number;
  waterPerLoad: number; // gallons of water (tank size - product volumes)
  products: LoadCalculation[];
  totalLoads?: number; // if totalAcres provided
  totalAcres?: number;
}

// For quick calculator (not saved)
export interface QuickMixInput {
  equipmentId: string;
  carrierGPA: number;
  totalAcres?: number;
  products: TankMixProduct[];
}
