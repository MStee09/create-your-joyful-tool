// ============================================================================
// Chemical Product Data Types
// For herbicides, fungicides, insecticides - restrictions, PHI, mixing order
// ============================================================================

export interface ActiveIngredient {
  name: string;
  concentration?: string; // e.g., "41%", "4 lb/gal"
  unit?: 'ae' | 'ai' | 'lbs/gal' | '%';
  chemicalClass?: string; // e.g., "Group 9", "amino acid synthesis inhibitor"
  moaGroup?: string; // Mode of Action group number
  chemicalFamily?: string; // e.g., "Glycine", "Triazine"
}

export interface RotationRestriction {
  crop: string;
  days?: number;
  months?: number;
  intervalUnit?: 'days' | 'months';
  conditions?: string; // e.g., "If no measurable rainfall within 7 days"
  notes?: string;
}

// Crop-specific PHI (Pre-Harvest Interval)
export interface CropSpecificPHI {
  crop: string;
  days: number;
  notes?: string;
}

// Rate by condition (soil type, organic matter, etc.)
export interface RateByCondition {
  condition: string; // e.g., "Coarse soils, <3% OM"
  min?: number;
  max?: number;
  unit: string;
  notes?: string;
}

// Grazing restriction per crop
export interface GrazingRestriction {
  crop: string;
  days: number;
  notes?: string;
}

export interface MaxRate {
  value: number;
  unit: string; // "oz/ac", "pt/ac", "lb ai/ac"
}

// Rate range for application
export interface RateRange {
  min?: number;
  max?: number;
  typical?: number;
  unit: string; // "oz/ac", "pt/ac", "fl oz/ac"
  notes?: string;
  byCondition?: RateByCondition[]; // Rates by soil type, OM, etc.
}

// Application requirements
export interface ApplicationRequirements {
  carrierGpaMin?: number;
  carrierGpaMax?: number;
  carrierGpaTypical?: number;
  carrierGpaMinAerial?: number; // Minimum for aerial application
  carrierGpaMinGround?: number; // Minimum for ground application
  dropletSize?: 'fine' | 'medium' | 'coarse' | 'very-coarse' | 'extremely-coarse' | 'ultra-coarse';
  sprayPressureMin?: number; // PSI
  sprayPressureMax?: number;
  groundSpeed?: string; // "5-10 mph"
  nozzleTypes?: string[]; // Recommended nozzle types
  applicationTiming?: string; // "Pre-emerge", "Post-emerge V2-V6"
  applicationMethods?: string[]; // "Preplant", "Preemergence", "Postemergence", etc.
  notes?: string;
}

// Adjuvant requirement types
export type AdjuvantType = 'MSO' | 'COC' | 'NIS' | 'AMS' | 'UAN' | 'oil-adjuvant' | 'surfactant' | 'drift-retardant' | 'water-conditioner' | 'other';

export interface AdjuvantRequirement {
  type: AdjuvantType;
  isRequired: boolean; // true = required, false = recommended
  rate?: string; // e.g., "1 qt/ac", "0.25% v/v", "2.5 lb/ac"
  rateValue?: number;
  rateUnit?: string;
  notes?: string;
  alternatives?: AdjuvantType[]; // e.g., MSO or COC
}

export interface Restrictions {
  phiDays?: number | null; // Pre-harvest interval in days, null = varies by crop
  phiByCrop?: CropSpecificPHI[]; // Crop-specific PHI when it varies
  rotationRestrictions?: RotationRestriction[];
  grazingRestrictions?: GrazingRestriction[]; // Grazing/feeding restrictions
  maxRatePerApplication?: MaxRate;
  maxRatePerSeason?: MaxRate;
  maxApplicationsPerSeason?: number;
  minDaysBetweenApplications?: number;
  reiHours?: number; // Restricted Entry Interval
  bufferZoneFeet?: number; // Legacy single buffer
  bufferZoneAerialFeet?: number; // Buffer for aerial application
  bufferZoneGroundFeet?: number; // Buffer for ground application
  endangeredSpeciesBufferAerialFeet?: number; // Endangered species buffer - aerial
  endangeredSpeciesBufferGroundFeet?: number; // Endangered species buffer - ground
  groundwaterAdvisory?: boolean;
  groundwaterNotes?: string; // Specific groundwater restrictions
  pollinator?: string; // e.g., "Do not apply during bloom"
  rainfast?: string; // e.g., "1 hour", "4 hours"
  notes?: string;
}

export type MixingOrderCategory = 
  | 'water-conditioner'
  | 'compatibility-agent'
  | 'dry-flowable'
  | 'wettable-powder'
  | 'suspension'
  | 'emulsifiable-concentrate'
  | 'solution'
  | 'surfactant'
  | 'drift-retardant'
  | 'other';

export interface MixingOrder {
  priority: number; // 1-10, lower = add first
  category: MixingOrderCategory;
  notes?: string;
}

export interface WaterQuality {
  phMin?: number;
  phMax?: number;
  phOptimal?: number;
  hardnessMax?: number; // ppm
  notes?: string;
}

// Crop-specific mixing warning
export interface CropMixingWarning {
  crop: string;
  warning: string;
  severity: 'caution' | 'avoid' | 'prohibited';
}

// Carrier volume configuration for mixing context
export interface CarrierVolume {
  aerialMin?: number;
  groundMin?: number;
  chemigationRange?: string;
  notes?: string;
}

export interface Compatibility {
  antagonists?: string[]; // Products that reduce efficacy
  synergists?: string[]; // Products that enhance efficacy
  incompatible?: string[]; // Products that cause physical incompatibility
  jarTest?: boolean; // Jar test recommended
  waterQuality?: WaterQuality;
  notes?: string;
  // Enhanced fields for mixing tab
  cautionWith?: string[]; // "May cause issues" warnings
  cropMixingWarnings?: CropMixingWarning[]; // Per-crop tank mix warnings
}

export type SignalWord = 'danger' | 'warning' | 'caution' | 'none';

// Subcategory for more specific classification
export type HerbicideSubcategory = 
  | 'pre-emerge-broadleaf'
  | 'pre-emerge-grass'
  | 'pre-emerge-broad-spectrum'
  | 'post-emerge-broadleaf'
  | 'post-emerge-grass'
  | 'post-emerge-broad-spectrum'
  | 'burndown'
  | 'desiccant'
  | 'growth-regulator';

export type FungicideSubcategory = 
  | 'preventive'
  | 'curative'
  | 'systemic'
  | 'contact'
  | 'seed-treatment';

export type InsecticideSubcategory = 
  | 'contact'
  | 'systemic'
  | 'soil-applied'
  | 'foliar'
  | 'seed-treatment';

export type ChemicalSubcategory = HerbicideSubcategory | FungicideSubcategory | InsecticideSubcategory | string;

export interface TargetPest {
  name: string;
  scientificName?: string;
  controlRating?: 'excellent' | 'good' | 'fair' | 'suppression';
}

export interface ChemicalData {
  activeIngredients?: ActiveIngredient[];
  restrictions?: Restrictions;
  mixingOrder?: MixingOrder;
  compatibility?: Compatibility;
  signalWord?: SignalWord;
  epaRegNumber?: string;
  formulationType?: string; // e.g., "SC", "EC", "WDG", "SL"
  
  // Extended fields
  subcategory?: ChemicalSubcategory;
  rateRange?: RateRange;
  applicationRequirements?: ApplicationRequirements;
  adjuvantRequirements?: AdjuvantRequirement[];
  targetPests?: TargetPest[];
  targetWeeds?: TargetPest[];
  
  // Carrier volume for mixing context
  carrierVolume?: CarrierVolume;
  
  // Extraction metadata (for AI-extracted data)
  extractedAt?: string;
  extractionConfidence?: 'high' | 'medium' | 'low';
  extractionNotes?: string;
}

// Standard mixing order by formulation type (for reference)
export const MIXING_ORDER_GUIDE: Record<MixingOrderCategory, { priority: number; description: string }> = {
  'water-conditioner': { priority: 1, description: 'AMS, water conditioners, pH adjusters' },
  'compatibility-agent': { priority: 2, description: 'Compatibility agents' },
  'dry-flowable': { priority: 3, description: 'Dry flowables (DF, WDG)' },
  'wettable-powder': { priority: 4, description: 'Wettable powders (WP)' },
  'suspension': { priority: 5, description: 'Flowables, suspensions (SC, F)' },
  'emulsifiable-concentrate': { priority: 6, description: 'Emulsifiable concentrates (EC)' },
  'solution': { priority: 7, description: 'Solutions (SL, S)' },
  'surfactant': { priority: 8, description: 'Surfactants, adjuvants, oils' },
  'drift-retardant': { priority: 9, description: 'Drift retardants' },
  'other': { priority: 10, description: 'Other products' },
};

export const SIGNAL_WORD_LABELS: Record<SignalWord, string> = {
  'danger': 'DANGER',
  'warning': 'WARNING',
  'caution': 'CAUTION',
  'none': 'None',
};

export const FORMULATION_TYPES = [
  { code: 'EC', name: 'Emulsifiable Concentrate' },
  { code: 'SC', name: 'Suspension Concentrate' },
  { code: 'SL', name: 'Soluble Liquid' },
  { code: 'WDG', name: 'Water Dispersible Granule' },
  { code: 'DF', name: 'Dry Flowable' },
  { code: 'WP', name: 'Wettable Powder' },
  { code: 'ME', name: 'Microencapsulated' },
  { code: 'SE', name: 'Suspo-emulsion' },
  { code: 'G', name: 'Granule' },
  { code: 'L', name: 'Liquid' },
];

export const ADJUVANT_TYPE_LABELS: Record<AdjuvantType, string> = {
  'MSO': 'Methylated Seed Oil',
  'COC': 'Crop Oil Concentrate',
  'NIS': 'Non-Ionic Surfactant',
  'AMS': 'Ammonium Sulfate',
  'UAN': 'Urea Ammonium Nitrate',
  'oil-adjuvant': 'Oil Adjuvant',
  'surfactant': 'Surfactant',
  'drift-retardant': 'Drift Retardant',
  'water-conditioner': 'Water Conditioner',
  'other': 'Other',
};

export const DROPLET_SIZE_LABELS: Record<string, string> = {
  'fine': 'Fine',
  'medium': 'Medium',
  'coarse': 'Coarse',
  'very-coarse': 'Very Coarse',
  'extremely-coarse': 'Extremely Coarse',
  'ultra-coarse': 'Ultra Coarse',
};

// Helper to check if a product category is a pesticide
export function isPesticideCategory(category: string): boolean {
  return ['herbicide', 'fungicide', 'insecticide', 'seed-treatment'].includes(category);
}

// Helper to check if a product is a chemical (includes adjuvants)
export function isChemicalCategory(category: string): boolean {
  return ['herbicide', 'fungicide', 'insecticide', 'seed-treatment', 'adjuvant'].includes(category);
}

// Helper to get default mixing order for a formulation type
export function getDefaultMixingOrder(formulationType: string): MixingOrder | null {
  const ftLower = formulationType.toLowerCase();
  
  if (['ec'].includes(ftLower)) {
    return { priority: 6, category: 'emulsifiable-concentrate' };
  }
  if (['sc', 'f', 'fl'].includes(ftLower)) {
    return { priority: 5, category: 'suspension' };
  }
  if (['sl', 's', 'l'].includes(ftLower)) {
    return { priority: 7, category: 'solution' };
  }
  if (['wdg', 'df'].includes(ftLower)) {
    return { priority: 3, category: 'dry-flowable' };
  }
  if (['wp'].includes(ftLower)) {
    return { priority: 4, category: 'wettable-powder' };
  }
  
  return null;
}

// Helper to get chemical data completeness status
export function getChemicalDataStatus(chemicalData?: ChemicalData): 'complete' | 'partial' | 'none' {
  if (!chemicalData) return 'none';
  
  const hasActiveIngredients = chemicalData.activeIngredients && chemicalData.activeIngredients.length > 0;
  const hasRestrictions = chemicalData.restrictions && (
    chemicalData.restrictions.phiDays !== undefined ||
    chemicalData.restrictions.reiHours !== undefined ||
    chemicalData.restrictions.maxApplicationsPerSeason !== undefined
  );
  const hasRates = chemicalData.rateRange && (
    chemicalData.rateRange.min !== undefined ||
    chemicalData.rateRange.max !== undefined
  );
  
  if (hasActiveIngredients && hasRestrictions && hasRates) {
    return 'complete';
  }
  if (hasActiveIngredients || hasRestrictions || hasRates) {
    return 'partial';
  }
  return 'none';
}
