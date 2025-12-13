import React from 'react';
import type { Crop, Product, NutrientSummary } from '../types';
import { calculateCropNutrientSummary, formatNumber } from '../lib/calculations';

interface NutrientSummaryPanelProps {
  crop: Crop;
  products: Product[];
}

export const NutrientSummaryPanel: React.FC<NutrientSummaryPanelProps> = ({ crop, products }) => {
  const nutrients = calculateCropNutrientSummary(crop, products);

  const hasNutrients = nutrients.n > 0 || nutrients.p > 0 || nutrients.k > 0 || nutrients.s > 0;

  if (!hasNutrients) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200">
      <div className="px-6 py-4 border-b border-stone-200">
        <h3 className="font-semibold text-stone-800">Nutrient Summary</h3>
        <p className="text-sm text-stone-500">Estimated lbs per acre from applications</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <p className="text-2xl font-bold text-emerald-700">{formatNumber(nutrients.n, 1)}</p>
            <p className="text-sm text-stone-600">N (lbs/ac)</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{formatNumber(nutrients.p, 1)}</p>
            <p className="text-sm text-stone-600">P (lbs/ac)</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-700">{formatNumber(nutrients.k, 1)}</p>
            <p className="text-sm text-stone-600">K (lbs/ac)</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-700">{formatNumber(nutrients.s, 1)}</p>
            <p className="text-sm text-stone-600">S (lbs/ac)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NutrientSummaryCompactProps {
  nutrientSummary: NutrientSummary;
  cropName: string;
}

export const NutrientSummaryCompact: React.FC<NutrientSummaryCompactProps> = ({
  nutrientSummary,
  cropName,
}) => {
  const hasNutrients = nutrientSummary.n > 0 || nutrientSummary.p > 0 || nutrientSummary.k > 0 || nutrientSummary.s > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <h4 className="font-medium text-stone-800 mb-3">{cropName}</h4>
      {hasNutrients ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold text-emerald-600">{formatNumber(nutrientSummary.n, 1)}</p>
            <p className="text-xs text-stone-500">N</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-blue-600">{formatNumber(nutrientSummary.p, 1)}</p>
            <p className="text-xs text-stone-500">P</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-amber-600">{formatNumber(nutrientSummary.k, 1)}</p>
            <p className="text-xs text-stone-500">K</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-purple-600">{formatNumber(nutrientSummary.s, 1)}</p>
            <p className="text-xs text-stone-500">S</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-400 text-center">No nutrient data</p>
      )}
    </div>
  );
};
