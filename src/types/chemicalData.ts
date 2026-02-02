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
}

export interface RotationRestriction {
  crop: string;
  days?: number;
  months?: number;
  notes?: string;
}

export interface MaxRate {
  value: number;
  unit: string; // "oz/ac", "pt/ac", "lb ai/ac"
}

export interface Restrictions {
  phiDays?: number; // Pre-harvest interval in days
  rotationRestrictions?: RotationRestriction[];
  maxRatePerApplication?: MaxRate;
  maxRatePerSeason?: MaxRate;
  maxApplicationsPerSeason?: number;
  reiHours?: number; // Restricted Entry Interval
  bufferZoneFeet?: number;
  groundwaterAdvisory?: boolean;
  pollinator?: string; // e.g., "Do not apply during bloom"
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

export interface Compatibility {
  antagonists?: string[]; // Products that reduce efficacy
  synergists?: string[]; // Products that enhance efficacy
  incompatible?: string[]; // Products that cause physical incompatibility
  jarTest?: boolean; // Jar test recommended
  notes?: string;
}

export type SignalWord = 'danger' | 'warning' | 'caution' | 'none';

export interface ChemicalData {
  activeIngredients?: ActiveIngredient[];
  restrictions?: Restrictions;
  mixingOrder?: MixingOrder;
  compatibility?: Compatibility;
  signalWord?: SignalWord;
  epaRegNumber?: string;
  formulationType?: string; // e.g., "SC", "EC", "WDG", "SL"
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

// Helper to check if a product category is a pesticide
export function isPesticideCategory(category: string): boolean {
  return ['herbicide', 'fungicide', 'insecticide', 'seed-treatment'].includes(category);
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
