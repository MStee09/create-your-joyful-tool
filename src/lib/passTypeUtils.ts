import { Application, ProductMaster, ProductCategory } from '@/types';
import { Leaf, FlaskRound, Bug, Wheat, Sprout, FlaskConical, Package, LucideIcon } from 'lucide-react';

export type PassType = 'herbicide' | 'fungicide' | 'insecticide' | 'fertility' | 'biological' | 'mixed' | 'other';

export interface PassTypeConfig {
  label: string;
  Icon: LucideIcon;
  bgColor: string;
  textColor: string;
}

export const PASS_TYPE_CONFIG: Record<PassType, PassTypeConfig> = {
  herbicide: {
    label: 'Herbicide',
    Icon: Leaf,
    bgColor: 'bg-green-500/15',
    textColor: 'text-green-600',
  },
  fungicide: {
    label: 'Fungicide',
    Icon: FlaskRound,
    bgColor: 'bg-purple-500/15',
    textColor: 'text-purple-600',
  },
  insecticide: {
    label: 'Insecticide',
    Icon: Bug,
    bgColor: 'bg-orange-500/15',
    textColor: 'text-orange-600',
  },
  fertility: {
    label: 'Fertility',
    Icon: Wheat,
    bgColor: 'bg-blue-500/15',
    textColor: 'text-blue-600',
  },
  biological: {
    label: 'Biological',
    Icon: Sprout,
    bgColor: 'bg-teal-500/15',
    textColor: 'text-teal-600',
  },
  mixed: {
    label: 'Mixed',
    Icon: FlaskConical,
    bgColor: 'bg-gray-500/15',
    textColor: 'text-gray-600',
  },
  other: {
    label: 'Other',
    Icon: Package,
    bgColor: 'bg-gray-500/15',
    textColor: 'text-gray-500',
  },
};

// Categories that count toward each pass type
const CATEGORY_MAP: Record<string, PassType> = {
  herbicide: 'herbicide',
  fungicide: 'fungicide',
  insecticide: 'insecticide',
  'fertilizer-liquid': 'fertility',
  'fertilizer-dry': 'fertility',
  micronutrient: 'fertility',
  biological: 'biological',
};

export function getPassType(
  applications: Application[],
  productMasters: ProductMaster[]
): PassType {
  if (!applications || applications.length === 0) {
    return 'other';
  }

  // Get categories for each application, ignoring adjuvants and unknowns
  const categories = applications
    .map(app => {
      const product = productMasters.find(p => p.id === app.productId);
      return product?.category;
    })
    .filter((c): c is ProductCategory => !!c && c !== 'adjuvant' && c !== 'other' && c !== 'seed-treatment');

  if (categories.length === 0) {
    return 'other';
  }

  // Count occurrences mapped to pass types
  const counts: Record<PassType, number> = {
    herbicide: 0,
    fungicide: 0,
    insecticide: 0,
    fertility: 0,
    biological: 0,
    mixed: 0,
    other: 0,
  };

  categories.forEach(category => {
    const passType = CATEGORY_MAP[category];
    if (passType) {
      counts[passType]++;
    }
  });

  // Get types with at least one product
  const significantTypes = (['herbicide', 'fungicide', 'insecticide', 'fertility', 'biological'] as PassType[])
    .filter(type => counts[type] > 0);

  if (significantTypes.length === 0) {
    return 'other';
  }

  if (significantTypes.length === 1) {
    return significantTypes[0];
  }

  // Multiple types = mixed
  return 'mixed';
}
