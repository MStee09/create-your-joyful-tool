import type { LiquidUnit, DryUnit } from '@/types/farm';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const convertToGallons = (value: number, unit: LiquidUnit): number => {
  switch (unit) {
    case 'oz': return value / 128;
    case 'qt': return value / 4;
    case 'gal': return value;
    default: return value;
  }
};

export const convertToPounds = (value: number, unit: DryUnit): number => {
  switch (unit) {
    case 'oz': return value / 16;
    case 'g': return value / 453.592;
    case 'lbs': return value;
    case 'ton': return value * 2000;
    default: return value;
  }
};

export const formatCurrency = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatNumber = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
