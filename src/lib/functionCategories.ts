// Function Categories for Pass-Level Intent
import type { ProductRole } from '@/types/productIntelligence';

export interface FunctionCategory {
  id: string;
  label: string;
  icon: string;
  roles: ProductRole[];
}

export const FUNCTION_CATEGORIES: FunctionCategory[] = [
  {
    id: 'rooting',
    label: 'Rooting',
    icon: '🌱',
    roles: ['rooting-vigor'],
  },
  {
    id: 'energy-carbon',
    label: 'Energy / Carbon',
    icon: '⚡',
    roles: ['carbon-biology-food', 'biostimulant'],
  },
  {
    id: 'n-efficiency',
    label: 'N Efficiency',
    icon: '🧪',
    roles: ['nitrogen-conversion'],
  },
  {
    id: 'stress',
    label: 'Stress',
    icon: '🛡',
    roles: ['stress-mitigation'],
  },
  {
    id: 'fertility',
    label: 'Fertility',
    icon: '🌾',
    roles: ['fertility-macro', 'fertility-micro'],
  },
  {
    id: 'uptake',
    label: 'Uptake',
    icon: '🔄',
    roles: ['uptake-translocation'],
  },
  {
    id: 'water-adj',
    label: 'Water / Adj',
    icon: '💧',
    roles: ['water-conditioning', 'adjuvant'],
  },
];

// Map a role to its function category
export const getRoleFunctionCategory = (role: ProductRole): FunctionCategory | undefined => {
  return FUNCTION_CATEGORIES.find(cat => cat.roles.includes(role));
};

// Get unique function labels from a list of roles
export const getFunctionLabelsFromRoles = (roles: ProductRole[]): string[] => {
  const categories = new Set<string>();
  roles.forEach(role => {
    const cat = getRoleFunctionCategory(role);
    if (cat) categories.add(cat.label);
  });
  return Array.from(categories);
};

// Phase classification based on timing index
export type TimingPhase = 'early' | 'mid' | 'late';

export const getTimingPhase = (index: number, total: number): TimingPhase => {
  if (total <= 1) return 'mid';
  const third = total / 3;
  if (index < third) return 'early';
  if (index < 2 * third) return 'mid';
  return 'late';
};
