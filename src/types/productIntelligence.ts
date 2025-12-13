// Product Intelligence Types - Analysis, Purpose, and AI Extraction

export type ProductRole = 
  | 'fertility-macro'
  | 'fertility-micro'
  | 'biostimulant'
  | 'carbon-biology-food'
  | 'stress-mitigation'
  | 'uptake-translocation'
  | 'nitrogen-conversion'
  | 'rooting-vigor'
  | 'water-conditioning'
  | 'adjuvant';

export const PRODUCT_ROLE_LABELS: Record<ProductRole, string> = {
  'fertility-macro': 'Fertility (Macro)',
  'fertility-micro': 'Fertility (Micro)',
  'biostimulant': 'Biostimulant',
  'carbon-biology-food': 'Carbon / Biology Food',
  'stress-mitigation': 'Stress Mitigation',
  'uptake-translocation': 'Uptake / Translocation',
  'nitrogen-conversion': 'Nitrogen Conversion',
  'rooting-vigor': 'Rooting / Vigor',
  'water-conditioning': 'Water Conditioning',
  'adjuvant': 'Adjuvant',
};

export interface MicroAnalysis {
  boron?: number;
  zinc?: number;
  manganese?: number;
  iron?: number;
  copper?: number;
  molybdenum?: number;
  cobalt?: number;
  nickel?: number;
}

export interface CarbonSources {
  humicAcid?: number;
  fulvicAcid?: number;
  sugars?: string;
  organicAcids?: string;
  aminoAcids?: string;
}

export interface BiologyProfile {
  microbes?: string[];
  enzymes?: string[];
  metabolites?: string[];
  cfuPerMl?: number;
}

export interface EnhancedNPKS {
  n: number;
  nForm?: 'urea' | 'nh4' | 'no3' | 'mixed';
  p: number;
  k: number;
  s: number;
  sForm?: 'sulfate' | 'thiosulfate' | 'elemental';
}

export interface ProductAnalysis {
  id: string;
  productId: string;
  
  // NPK-S (enhanced)
  npks: EnhancedNPKS;
  
  // Micronutrients
  micros?: MicroAnalysis;
  
  // Carbon & Biology
  carbonSources?: CarbonSources;
  biology?: BiologyProfile;
  
  // Physical properties
  densityLbsPerGal?: number;
  
  // Uses
  approvedUses: string[];
  
  // Extraction metadata
  extractionConfidence: 'high' | 'medium' | 'low';
  extractedAt: string;
  userConfirmed: boolean;
  sourceFileName?: string;
}

// Individual role suggestion with confidence and evidence
export interface RoleSuggestion {
  role: ProductRole;
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
  evidence: string[];
}

// Result from AI role suggestion
export interface RoleSuggestionResult {
  suggestions: RoleSuggestion[];
  analyzedAt: string;
  sourceInfo: string;
}

export interface ProductPurpose {
  id: string;
  productId: string;
  
  // Auto-suggested roles (multi-select)
  roles: ProductRole[];
  
  // Whether roles have been reviewed/confirmed by user
  rolesConfirmed?: boolean;
  confirmedAt?: string;
  
  // "Why it's in my program" (user-authored)
  primaryObjective?: string;
  whenItMatters?: string;
  synergies?: string[];
  watchOuts?: string[];
  proofRationale?: string;
  
  // AI-generated research notes (optional)
  researchNotes?: string;
  researchGeneratedAt?: string;
}

export interface ApplicationOverride {
  applicationId: string;
  whyHere?: string;
  customRoles?: ProductRole[];
  notes?: string;
}

// AI Extraction response
export interface LabelExtractionResult {
  analysis: Omit<ProductAnalysis, 'id' | 'productId' | 'userConfirmed'>;
  suggestedRoles: ProductRole[];
  rawText?: string;
}
