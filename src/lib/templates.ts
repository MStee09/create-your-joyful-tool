// ============================================================================
// Crop plan templates for fast setup
// ============================================================================

import type { Crop, ApplicationTiming, Season } from '@/types';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export type CropTemplate = {
  id: string;
  name: string;
  description: string;
  defaultAcres: number;
  timings: Array<{ name: string; order: number }>;
};

export const CROP_TEMPLATES: CropTemplate[] = [
  {
    id: 'corn-standard',
    name: 'Corn — Standard',
    description: 'Common passes for corn. Adds timings only (no product IDs).',
    defaultAcres: 150,
    timings: [
      { name: 'Pre-Plant', order: 10 },
      { name: 'At Planting (In-Furrow)', order: 20 },
      { name: 'At Planting (2x2)', order: 30 },
      { name: 'V3–V4 Herbicide', order: 40 },
      { name: 'V4–V5 Foliar', order: 50 },
      { name: 'V5 Topdress', order: 60 },
      { name: 'V10–V11 Foliar (Drone)', order: 70 },
      { name: 'R2 Foliar (Drone)', order: 80 },
      { name: 'R3–R4 Foliar (Drone)', order: 90 },
    ],
  },
  {
    id: 'beans-standard',
    name: 'Edible Beans — Standard',
    description: 'Common passes for edible beans.',
    defaultAcres: 150,
    timings: [
      { name: 'Pre-Plant', order: 10 },
      { name: 'At Planting (In-Furrow)', order: 20 },
      { name: 'At Planting (2x2)', order: 30 },
      { name: 'POST Herbicide (V1–V2)', order: 40 },
      { name: 'V9–V11 Foliar', order: 50 },
      { name: 'R2 Foliar', order: 60 },
      { name: 'R4 Foliar (optional)', order: 70 },
      { name: 'R5 Foliar (optional)', order: 80 },
      { name: 'Desiccation', order: 90 },
    ],
  },
  {
    id: 'barley-standard',
    name: 'Spring Barley — Standard',
    description: 'Common passes for spring barley.',
    defaultAcres: 150,
    timings: [
      { name: 'Pre-Plant', order: 10 },
      { name: 'At Planting (In-Furrow)', order: 20 },
      { name: 'Tillering Streambar', order: 30 },
      { name: 'Jointing Streambar', order: 40 },
      { name: 'Flag Leaf Foliar', order: 50 },
      { name: 'Heading Fungicide (as needed)', order: 60 },
      { name: 'Grain Fill Foliar (optional)', order: 70 },
    ],
  },
  {
    id: 'soybeans-standard',
    name: 'Soybeans — Standard',
    description: 'Common passes for soybeans.',
    defaultAcres: 150,
    timings: [
      { name: 'Pre-Plant', order: 10 },
      { name: 'At Planting (In-Furrow)', order: 20 },
      { name: 'At Planting (2x2)', order: 30 },
      { name: 'V2–V3 POST Herbicide', order: 40 },
      { name: 'R1 Foliar', order: 50 },
      { name: 'R3 Foliar', order: 60 },
      { name: 'R5 Foliar (optional)', order: 70 },
    ],
  },
  {
    id: 'wheat-winter',
    name: 'Winter Wheat — Standard',
    description: 'Common passes for winter wheat.',
    defaultAcres: 150,
    timings: [
      { name: 'Fall Pre-Plant', order: 10 },
      { name: 'Fall At Planting', order: 20 },
      { name: 'Spring Greenup', order: 30 },
      { name: 'Tillering', order: 40 },
      { name: 'Jointing', order: 50 },
      { name: 'Flag Leaf', order: 60 },
      { name: 'Heading Fungicide', order: 70 },
    ],
  },
];

function createDefaultCrop(name: string, acres: number): Crop {
  return {
    id: generateId(),
    name,
    totalAcres: acres,
    tiers: [{ id: generateId(), name: 'Default', percentage: 100 }],
    applicationTimings: [],
    applications: [],
    seedTreatments: [],
  };
}

export function applyTemplateToSeason(opts: {
  season: Season;
  template: CropTemplate;
  mode: 'add' | 'replace_timings';
  acres?: number;
}): Season {
  const { season, template, mode } = opts;
  const acres = opts.acres ?? template.defaultAcres;

  const cropBaseName = template.name.split('—')[0].trim().toLowerCase();
  const existing = season.crops.find(c => c.name.toLowerCase().includes(cropBaseName));
  
  const buildTimings = (): ApplicationTiming[] =>
    template.timings.map(t => ({ id: generateId(), name: t.name, order: t.order }));

  if (!existing) {
    const cropName = template.name.split('—')[0].trim();
    const crop: Crop = createDefaultCrop(cropName, acres);
    crop.applicationTimings = buildTimings();
    return { ...season, crops: [...season.crops, crop] };
  }

  if (mode === 'replace_timings') {
    const next = season.crops.map(c => {
      if (c.id !== existing.id) return c;
      return { ...c, totalAcres: acres, applicationTimings: buildTimings() };
    });
    return { ...season, crops: next };
  }

  // mode === 'add' (merge: only add missing timing names)
  const existingNames = new Set(existing.applicationTimings.map(t => t.name.toLowerCase()));
  const merged = [
    ...existing.applicationTimings,
    ...template.timings
      .filter(t => !existingNames.has(t.name.toLowerCase()))
      .map(t => ({ id: generateId(), name: t.name, order: t.order })),
  ].sort((a, b) => (a.order || 0) - (b.order || 0));

  const next = season.crops.map(c => (c.id === existing.id ? { ...c, totalAcres: acres, applicationTimings: merged } : c));
  return { ...season, crops: next };
}
