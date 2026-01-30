// Timing bucket types
export type TimingBucket = 'PRE_PLANT' | 'AT_PLANTING' | 'IN_SEASON' | 'POST_HARVEST';

// Crop types for growth stage selection
export type CropType = 'corn' | 'soybeans' | 'dry_beans' | 'small_grains' | 'sunflowers' | 'other';

// Infer crop type from crop name
export function inferCropTypeFromName(name: string): CropType {
  const lower = name.toLowerCase();
  
  if (lower.includes('corn') || lower.includes('maize')) return 'corn';
  if (lower.includes('soybean') || lower.includes('soy bean')) return 'soybeans';
  if (lower.includes('edible bean') || lower.includes('dry bean') || 
      lower.includes('black turtle') || lower.includes('field pea') || 
      lower.includes('small red') || lower.includes('pinto') ||
      lower.includes('navy bean') || lower.includes('kidney') ||
      lower.includes('bean')) return 'dry_beans';
  if (lower.includes('wheat') || lower.includes('barley') || 
      lower.includes('oat') || lower.includes('rye')) return 'small_grains';
  if (lower.includes('sunflower')) return 'sunflowers';
  
  return 'other';
}

// Legacy crop type mapping for backward compatibility - now with name inference fallback
export function normalizeCropType(cropType: string | undefined, cropName?: string): CropType {
  // If cropType is explicitly set, use it (with legacy mapping)
  if (cropType) {
    if (cropType === 'wheat') return 'small_grains';
    if (cropType === 'edible_beans') return 'dry_beans';
    return cropType as CropType;
  }
  
  // If no cropType but we have a name, infer from name
  if (cropName) {
    return inferCropTypeFromName(cropName);
  }
  
  // Default fallback
  return 'corn';
}

// Timing bucket display info
export const TIMING_BUCKET_INFO: Record<TimingBucket, { label: string; order: number }> = {
  PRE_PLANT: { label: 'Pre-Plant', order: 0 },
  AT_PLANTING: { label: 'At Planting', order: 1 },
  IN_SEASON: { label: 'In-Season', order: 2 },
  POST_HARVEST: { label: 'Post-Harvest', order: 3 },
};

// Crop type display names
export const CROP_TYPE_LABELS: Record<CropType, string> = {
  corn: 'Corn',
  soybeans: 'Soybeans',
  dry_beans: 'Dry Beans',
  small_grains: 'Small Grains',
  sunflowers: 'Sunflowers',
  other: 'Other',
};

// Growth stage with description
interface GrowthStage {
  stage: string;
  description: string;
  order: number;
}

// Growth stages per crop type (with sort order and descriptions)
export const GROWTH_STAGES: Record<CropType, GrowthStage[]> = {
  corn: [
    { stage: 'VE', description: 'Emergence', order: 0 },
    { stage: 'V1', description: 'First leaf collar', order: 1 },
    { stage: 'V2', description: 'Second leaf collar', order: 2 },
    { stage: 'V3', description: 'Third leaf collar', order: 3 },
    { stage: 'V4', description: 'Fourth leaf collar', order: 4 },
    { stage: 'V5', description: 'Fifth leaf collar', order: 5 },
    { stage: 'V6', description: 'Sixth leaf collar', order: 6 },
    { stage: 'V7', description: 'Seventh leaf collar', order: 7 },
    { stage: 'V8', description: 'Eighth leaf collar', order: 8 },
    { stage: 'V9', description: 'Ninth leaf collar', order: 9 },
    { stage: 'V10', description: 'Tenth leaf collar', order: 10 },
    { stage: 'V11', description: 'Eleventh leaf collar', order: 11 },
    { stage: 'V12', description: 'Twelfth leaf collar', order: 12 },
    { stage: 'V13', description: 'Thirteenth leaf collar', order: 13 },
    { stage: 'V14', description: 'Fourteenth leaf collar', order: 14 },
    { stage: 'V15', description: 'Fifteenth leaf collar', order: 15 },
    { stage: 'V16', description: 'Sixteenth leaf collar', order: 16 },
    { stage: 'V17', description: 'Seventeenth leaf collar', order: 17 },
    { stage: 'V18', description: 'Eighteenth leaf collar', order: 18 },
    { stage: 'VT', description: 'Tasseling', order: 19 },
    { stage: 'R1', description: 'Silking', order: 20 },
    { stage: 'R2', description: 'Blister', order: 21 },
    { stage: 'R3', description: 'Milk', order: 22 },
    { stage: 'R4', description: 'Dough', order: 23 },
    { stage: 'R5', description: 'Dent', order: 24 },
    { stage: 'R6', description: 'Maturity', order: 25 },
  ],
  soybeans: [
    { stage: 'VE', description: 'Emergence', order: 0 },
    { stage: 'VC', description: 'Cotyledon', order: 1 },
    { stage: 'V1', description: 'First node', order: 2 },
    { stage: 'V2', description: 'Second node', order: 3 },
    { stage: 'V3', description: 'Third node', order: 4 },
    { stage: 'V4', description: 'Fourth node', order: 5 },
    { stage: 'V5', description: 'Fifth node', order: 6 },
    { stage: 'V6', description: 'Sixth node', order: 7 },
    { stage: 'V7', description: 'Seventh node', order: 8 },
    { stage: 'V8', description: 'Eighth node', order: 9 },
    { stage: 'R1', description: 'Beginning bloom', order: 10 },
    { stage: 'R2', description: 'Full bloom', order: 11 },
    { stage: 'R3', description: 'Beginning pod', order: 12 },
    { stage: 'R4', description: 'Full pod', order: 13 },
    { stage: 'R5', description: 'Beginning seed', order: 14 },
    { stage: 'R6', description: 'Full seed', order: 15 },
    { stage: 'R7', description: 'Beginning maturity', order: 16 },
    { stage: 'R8', description: 'Full maturity', order: 17 },
  ],
  dry_beans: [
    { stage: 'VE', description: 'Emergence', order: 0 },
    { stage: 'VC', description: 'Unifoliate', order: 1 },
    { stage: 'V1', description: 'First trifoliate', order: 2 },
    { stage: 'V2', description: 'Second trifoliate', order: 3 },
    { stage: 'V3', description: 'Third trifoliate', order: 4 },
    { stage: 'V4', description: 'Fourth trifoliate', order: 5 },
    { stage: 'V5', description: 'Flower buds visible', order: 6 },
    { stage: 'R1', description: 'Beginning bloom', order: 7 },
    { stage: 'R2', description: 'Beginning pod (pin bean)', order: 8 },
    { stage: 'R3', description: '50% bloom', order: 9 },
    { stage: 'R4', description: 'Full pod', order: 10 },
    { stage: 'R5', description: 'Beginning seed', order: 11 },
    { stage: 'R6', description: '50% seed', order: 12 },
    { stage: 'R7', description: 'Full seed', order: 13 },
    { stage: 'R8', description: 'Beginning maturity', order: 14 },
    { stage: 'R8.5', description: 'Mid maturity', order: 15 },
    { stage: 'R9', description: 'Full maturity', order: 16 },
  ],
  small_grains: [
    { stage: 'F1', description: 'One shoot', order: 0 },
    { stage: 'F2', description: 'Tillering begins', order: 1 },
    { stage: 'F3', description: 'Tillers formed', order: 2 },
    { stage: 'F4', description: 'Leaf sheaths lengthen', order: 3 },
    { stage: 'F5', description: 'Leaf sheaths strongly erected', order: 4 },
    { stage: 'F6', description: 'First node visible', order: 5 },
    { stage: 'F7', description: 'Second node visible', order: 6 },
    { stage: 'F8', description: 'Last leaf just visible', order: 7 },
    { stage: 'F9', description: 'Ligule of last leaf visible', order: 8 },
    { stage: 'F10', description: 'In boot', order: 9 },
    { stage: 'F10.1', description: 'Heading', order: 10 },
    { stage: 'F10.5', description: 'Flowering', order: 11 },
    { stage: 'F10.5.1', description: 'Beginning flowering', order: 12 },
    { stage: 'F10.5.2', description: 'Flowering complete', order: 13 },
    { stage: 'F11', description: 'Ripening', order: 14 },
    { stage: 'F11.1', description: 'Milk', order: 15 },
    { stage: 'F11.2', description: 'Soft dough', order: 16 },
    { stage: 'F11.3', description: 'Hard dough', order: 17 },
    { stage: 'F11.4', description: 'Harvest ready', order: 18 },
  ],
  sunflowers: [
    { stage: 'VE', description: 'Emergence', order: 0 },
    { stage: 'V1', description: 'First true leaves', order: 1 },
    { stage: 'V2', description: 'Two true leaves', order: 2 },
    { stage: 'V3', description: 'Three true leaves', order: 3 },
    { stage: 'V4', description: 'Four true leaves', order: 4 },
    { stage: 'V5', description: 'Five true leaves', order: 5 },
    { stage: 'V6', description: 'Six true leaves', order: 6 },
    { stage: 'V8', description: 'Eight true leaves', order: 7 },
    { stage: 'V10', description: 'Ten true leaves', order: 8 },
    { stage: 'V12', description: 'Twelve true leaves', order: 9 },
    { stage: 'V14', description: 'Fourteen true leaves', order: 10 },
    { stage: 'V16', description: 'Sixteen true leaves', order: 11 },
    { stage: 'R1', description: 'Bud visible', order: 12 },
    { stage: 'R2', description: 'Bud elongation', order: 13 },
    { stage: 'R3', description: 'Bud opening', order: 14 },
    { stage: 'R4', description: 'Inflorescence begins', order: 15 },
    { stage: 'R5', description: 'Beginning flowering', order: 16 },
    { stage: 'R5.1', description: '10% flowering', order: 17 },
    { stage: 'R5.5', description: '50% flowering', order: 18 },
    { stage: 'R5.9', description: '90% flowering', order: 19 },
    { stage: 'R6', description: 'Flowering complete', order: 20 },
    { stage: 'R7', description: 'Back of head pale yellow', order: 21 },
    { stage: 'R8', description: 'Back of head yellow', order: 22 },
    { stage: 'R9', description: 'Physiological maturity', order: 23 },
  ],
  other: [
    { stage: 'Early', description: 'Early season', order: 0 },
    { stage: 'Mid', description: 'Mid season', order: 1 },
    { stage: 'Late', description: 'Late season', order: 2 },
  ],
};

// Get stage order for sorting
export function getStageOrder(cropType: CropType | string | undefined, stage: string | undefined): number {
  if (!stage) return 999;
  const normalizedCropType = normalizeCropType(cropType);
  const stages = GROWTH_STAGES[normalizedCropType];
  const found = stages.find(s => s.stage === stage);
  return found?.order ?? 999;
}

// Get stage with description for display
export function getStageDisplay(cropType: CropType | string | undefined, stage: string): string {
  const normalizedCropType = normalizeCropType(cropType);
  const stages = GROWTH_STAGES[normalizedCropType];
  const found = stages.find(s => s.stage === stage);
  return found ? `${stage} - ${found.description}` : stage;
}

// Get timing display text
export function getTimingDisplayText(
  timingBucket: TimingBucket,
  growthStageStart?: string,
  growthStageEnd?: string
): string {
  if (timingBucket !== 'IN_SEASON') {
    return TIMING_BUCKET_INFO[timingBucket].label;
  }
  
  if (!growthStageStart) {
    return 'In-Season';
  }
  
  if (growthStageEnd && growthStageEnd !== growthStageStart) {
    return `${growthStageStart} → ${growthStageEnd}`;
  }
  
  return growthStageStart;
}

// Infer timing bucket from pass name
export function inferTimingBucket(name: string): TimingBucket {
  const lower = name.toLowerCase();
  
  if (lower.includes('pre-plant') || lower.includes('preplant') || lower.includes('pre plant')) {
    return 'PRE_PLANT';
  }
  
  if (lower.includes('plant') || lower.includes('furrow') || lower.includes('2x2') || lower.includes('starter')) {
    return 'AT_PLANTING';
  }
  
  if (lower.includes('post-harvest') || lower.includes('postharvest') || lower.includes('fall') || lower.includes('residue')) {
    return 'POST_HARVEST';
  }
  
  return 'IN_SEASON';
}

// Infer growth stage from pass name
export function inferGrowthStage(name: string, cropType: CropType | string | undefined): { start?: string; end?: string } {
  const normalizedCropType = normalizeCropType(cropType);
  const stages = GROWTH_STAGES[normalizedCropType];
  
  // Check for range pattern (e.g., "V4-V6" or "V4 to V6")
  const rangeMatch = name.match(/([VRF][\d.]+)\s*[-–—to]\s*([VRF][\d.]+)/i);
  if (rangeMatch) {
    const start = stages.find(s => s.stage.toLowerCase() === rangeMatch[1].toLowerCase())?.stage;
    const end = stages.find(s => s.stage.toLowerCase() === rangeMatch[2].toLowerCase())?.stage;
    if (start) return { start, end };
  }
  
  // Check for single stage
  for (const { stage } of stages) {
    if (name.includes(stage)) {
      return { start: stage };
    }
  }
  
  return {};
}
