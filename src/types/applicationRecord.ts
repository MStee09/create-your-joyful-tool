// ============================================================================
// Application Recording Types - Phase 5
// For tracking actual field applications with inventory deduction
// ============================================================================

import type { ChemicalData } from './chemicalData';

/**
 * Individual product applied in an application record
 */
export interface ApplicationProductRecord {
  productId: string;
  productName: string;
  plannedRate: number;      // Rate from crop plan
  actualRate: number;       // Rate actually applied
  rateUnit: string;
  totalApplied: number;     // actualRate × acresTreated
  totalUnit: string;        // Converted unit (gal, lbs, etc.)
  inventoryDeducted: boolean;
  inventoryTransactionId?: string;
  wasAddedInSeason: boolean; // True if not in original plan
}

/**
 * Restriction warning that was overridden during application
 */
export interface OverriddenWarning {
  type: 'rotation' | 'phi' | 'max-per-season' | 'max-per-application' | 'carrier-volume';
  productId: string;
  productName: string;
  message: string;
  overrideReason: string;
  overriddenAt: string;
}

/**
 * Main application record - tracks a single field application event
 */
export interface ApplicationRecord {
  id: string;
  seasonId: string;
  cropId: string;
  fieldId: string;
  timingId: string;           // References ApplicationTiming.id from crop plan
  dateApplied: string;        // ISO date string
  acresTreated: number;
  products: ApplicationProductRecord[];
  equipmentId?: string;
  carrierGPA?: number;
  applicator: 'self' | 'custom';
  customApplicatorName?: string;
  weatherNotes?: string;
  notes?: string;
  overriddenWarnings?: OverriddenWarning[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new application record
 */
export interface NewApplicationRecord {
  seasonId: string;
  cropId: string;
  fieldId: string;
  timingId: string;
  dateApplied: string;
  acresTreated: number;
  products: Omit<ApplicationProductRecord, 'inventoryDeducted' | 'inventoryTransactionId'>[];
  equipmentId?: string;
  carrierGPA?: number;
  applicator: 'self' | 'custom';
  customApplicatorName?: string;
  weatherNotes?: string;
  notes?: string;
  overriddenWarnings?: OverriddenWarning[];
}

/**
 * Summary of applications for a field/timing combination
 */
export interface ApplicationSummary {
  fieldId: string;
  fieldName: string;
  timingId: string;
  timingName: string;
  cropId: string;
  cropName: string;
  plannedAcres: number;
  appliedAcres: number;
  applicationCount: number;
  lastApplicationDate?: string;
  status: 'not-started' | 'partial' | 'complete';
}

/**
 * Planned vs actual comparison for a product
 */
export interface PlannedVsActual {
  productId: string;
  productName: string;
  plannedRate: number;
  actualRate: number;
  rateUnit: string;
  variance: number;          // Percentage: (actual - planned) / planned * 100
  plannedTotal: number;
  actualTotal: number;
  totalUnit: string;
}

/**
 * Context for pre-populating the Record Application modal
 */
export interface RecordApplicationContext {
  source: 'dashboard' | 'crop-plan' | 'mix-calculator' | 'field-detail';
  seasonId?: string;
  cropId?: string;
  timingId?: string;
  fieldIds?: string[];
  products?: Array<{
    productId: string;
    rate: number;
    rateUnit: string;
  }>;
  equipmentId?: string;
  carrierGPA?: number;
}

/**
 * Inventory shortage info for a product
 */
export interface InventoryShortage {
  productId: string;
  productName: string;
  needed: number;
  onHand: number;
  shortage: number;
  unit: string;
}

/**
 * Options for handling inventory shortage
 */
export type ShortageResolution = 
  | { type: 'record-purchase'; purchaseId?: string }
  | { type: 'add-carryover'; quantity: number }
  | { type: 'save-anyway' }
  | { type: 'cancel' };
