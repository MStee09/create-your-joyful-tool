// ============================================================================
// Field and Equipment Types for Phase 1
// ============================================================================

export type SoilType = 
  | 'sandy' 
  | 'sandy-loam' 
  | 'loam' 
  | 'silt-loam' 
  | 'clay-loam' 
  | 'clay' 
  | 'heavy-clay' 
  | 'organic';

export const SOIL_TYPE_LABELS: Record<SoilType, string> = {
  'sandy': 'Sandy',
  'sandy-loam': 'Sandy Loam',
  'loam': 'Loam',
  'silt-loam': 'Silt Loam',
  'clay-loam': 'Clay Loam',
  'clay': 'Clay',
  'heavy-clay': 'Heavy Clay',
  'organic': 'Organic/Muck',
};

export const SOIL_TYPES: SoilType[] = [
  'sandy',
  'sandy-loam',
  'loam',
  'silt-loam',
  'clay-loam',
  'clay',
  'heavy-clay',
  'organic',
];

export interface Field {
  id: string;
  name: string;
  acres: number;
  farm?: string;
  soilType?: SoilType;
  pH?: number;
  organicMatter?: number;
  cec?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldAssignment {
  id: string;
  seasonId: string;
  fieldId: string;
  cropId: string;
  acres: number;
  yieldGoal?: number;
  yieldUnit?: 'bu/ac' | 'lbs/ac' | 'tons/ac';
  actualYield?: number;
  previousCropId?: string;
  previousCropName?: string;
  createdAt: string;
}

export type EquipmentType = 
  | 'sprayer' 
  | 'planter-fert' 
  | 'sidedress' 
  | 'spreader' 
  | 'other';

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  'sprayer': 'Sprayer',
  'planter-fert': 'Planter/Fert',
  'sidedress': 'Side-dress',
  'spreader': 'Spreader',
  'other': 'Other',
};

export const EQUIPMENT_TYPES: EquipmentType[] = [
  'sprayer',
  'planter-fert',
  'sidedress',
  'spreader',
  'other',
];

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  tankSize: number;
  tankUnit: 'gal';
  defaultCarrierGPA?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// For crop history display on field detail
export interface FieldCropHistoryEntry {
  year: number;
  seasonId: string;
  cropName: string;
  cropId: string;
  acres: number;
  actualYield?: number;
  yieldUnit?: string;
}

// Helper to create a new field with defaults
export function createDefaultField(partial: Partial<Field> = {}): Field {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: '',
    acres: 0,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

// Helper to create new equipment with defaults
export function createDefaultEquipment(partial: Partial<Equipment> = {}): Equipment {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: '',
    type: 'sprayer',
    tankSize: 0,
    tankUnit: 'gal',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}
