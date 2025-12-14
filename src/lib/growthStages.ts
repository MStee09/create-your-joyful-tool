// Timing bucket types
export type TimingBucket = 'PRE_PLANT' | 'AT_PLANTING' | 'IN_SEASON' | 'POST_HARVEST';

// Crop types for growth stage selection
export type CropType = 'corn' | 'soybeans' | 'wheat' | 'small_grains' | 'edible_beans' | 'other';

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
  wheat: 'Wheat',
  small_grains: 'Small Grains',
  edible_beans: 'Edible Beans',
  other: 'Other',
};

// Growth stages per crop type (with sort order)
export const GROWTH_STAGES: Record<CropType, { stage: string; order: number }[]> = {
  corn: [
    { stage: 'VE', order: 0 },
    { stage: 'V2', order: 1 },
    { stage: 'V3', order: 2 },
    { stage: 'V4', order: 3 },
    { stage: 'V5', order: 4 },
    { stage: 'V6', order: 5 },
    { stage: 'V7', order: 6 },
    { stage: 'V8', order: 7 },
    { stage: 'V9', order: 8 },
    { stage: 'V10', order: 9 },
    { stage: 'V12', order: 10 },
    { stage: 'V14', order: 11 },
    { stage: 'VT', order: 12 },
    { stage: 'R1', order: 13 },
    { stage: 'R2', order: 14 },
    { stage: 'R3', order: 15 },
    { stage: 'R4', order: 16 },
    { stage: 'R5', order: 17 },
    { stage: 'R6', order: 18 },
  ],
  soybeans: [
    { stage: 'VE', order: 0 },
    { stage: 'VC', order: 1 },
    { stage: 'V1', order: 2 },
    { stage: 'V2', order: 3 },
    { stage: 'V3', order: 4 },
    { stage: 'V4', order: 5 },
    { stage: 'V5', order: 6 },
    { stage: 'V6', order: 7 },
    { stage: 'R1', order: 8 },
    { stage: 'R2', order: 9 },
    { stage: 'R3', order: 10 },
    { stage: 'R4', order: 11 },
    { stage: 'R5', order: 12 },
    { stage: 'R6', order: 13 },
    { stage: 'R7', order: 14 },
    { stage: 'R8', order: 15 },
  ],
  wheat: [
    { stage: 'Emergence', order: 0 },
    { stage: 'Tillering', order: 1 },
    { stage: 'Jointing', order: 2 },
    { stage: 'Flag Leaf', order: 3 },
    { stage: 'Heading', order: 4 },
    { stage: 'Flowering', order: 5 },
    { stage: 'Grain Fill', order: 6 },
    { stage: 'Maturity', order: 7 },
  ],
  small_grains: [
    { stage: 'Emergence', order: 0 },
    { stage: 'Tillering', order: 1 },
    { stage: 'Jointing', order: 2 },
    { stage: 'Flag Leaf', order: 3 },
    { stage: 'Heading', order: 4 },
    { stage: 'Flowering', order: 5 },
    { stage: 'Grain Fill', order: 6 },
    { stage: 'Maturity', order: 7 },
  ],
  edible_beans: [
    { stage: 'VE', order: 0 },
    { stage: 'V1', order: 1 },
    { stage: 'V2', order: 2 },
    { stage: 'V3', order: 3 },
    { stage: 'V4', order: 4 },
    { stage: 'V5', order: 5 },
    { stage: 'R1', order: 6 },
    { stage: 'R2', order: 7 },
    { stage: 'R3', order: 8 },
    { stage: 'R4', order: 9 },
    { stage: 'R5', order: 10 },
  ],
  other: [
    { stage: 'Early', order: 0 },
    { stage: 'Mid', order: 1 },
    { stage: 'Late', order: 2 },
  ],
};

// Get stage order for sorting
export function getStageOrder(cropType: CropType | undefined, stage: string | undefined): number {
  if (!stage) return 999;
  const stages = GROWTH_STAGES[cropType || 'corn'];
  const found = stages.find(s => s.stage === stage);
  return found?.order ?? 999;
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
export function inferGrowthStage(name: string, cropType: CropType | undefined): { start?: string; end?: string } {
  const stages = GROWTH_STAGES[cropType || 'corn'];
  
  // Check for range pattern (e.g., "V4-V6" or "V4 to V6")
  const rangeMatch = name.match(/([VR]\d+)\s*[-–—to]\s*([VR]\d+)/i);
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
