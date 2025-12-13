import React, { useState } from 'react';
import { Plus, Trash2, FlaskConical } from 'lucide-react';
import type { Crop, Product, SeedTreatment } from '../types';
import { formatCurrency, generateId } from '../lib/calculations';

interface SeedTreatmentCalculatorProps {
  crop: Crop;
  products: Product[];
  onUpdate: (crop: Crop) => void;
}

export const SeedTreatmentCalculator: React.FC<SeedTreatmentCalculatorProps> = ({
  crop,
  products,
  onUpdate,
}) => {
  const [showAdd, setShowAdd] = useState(false);

  const handleAddTreatment = () => {
    const newTreatment: SeedTreatment = {
      id: generateId(),
      productId: products[0]?.id || '',
      ratePerCwt: 0,
      rateUnit: 'oz',
      plantingRateLbsPerAcre: 32,
    };
    onUpdate({
      ...crop,
      seedTreatments: [...crop.seedTreatments, newTreatment],
    });
    setShowAdd(false);
  };

  const handleUpdateTreatment = (id: string, updates: Partial<SeedTreatment>) => {
    onUpdate({
      ...crop,
      seedTreatments: crop.seedTreatments.map(st =>
        st.id === id ? { ...st, ...updates } : st
      ),
    });
  };

  const handleDeleteTreatment = (id: string) => {
    onUpdate({
      ...crop,
      seedTreatments: crop.seedTreatments.filter(st => st.id !== id),
    });
  };

  const calculateTreatmentCost = (st: SeedTreatment) => {
    const product = products.find(p => p.id === st.productId);
    if (!product) return { costPerAcre: 0, totalCost: 0 };

    const cwtPerAcre = st.plantingRateLbsPerAcre / 100;
    let productPerAcre = 0;

    if (st.rateUnit === 'oz') {
      productPerAcre = (st.ratePerCwt * cwtPerAcre) / 128;
    } else {
      productPerAcre = (st.ratePerCwt * cwtPerAcre) / 453.592 / 128;
    }

    const costPerAcre = productPerAcre * product.price;
    return {
      costPerAcre,
      totalCost: costPerAcre * crop.totalAcres,
    };
  };

  const totalSeedTreatmentCost = crop.seedTreatments.reduce((sum, st) => {
    return sum + calculateTreatmentCost(st).totalCost;
  }, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200">
      <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-semibold text-stone-800">Seed Treatments</h3>
            <p className="text-sm text-stone-500">
              {crop.seedTreatments.length} treatments • {formatCurrency(totalSeedTreatmentCost)} total
            </p>
          </div>
        </div>
        <button
          onClick={() => crop.seedTreatments.length === 0 ? handleAddTreatment() : setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Treatment
        </button>
      </div>

      {crop.seedTreatments.length > 0 && (
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4 w-24">Rate/CWT</th>
                <th className="pb-2 pr-4 w-20">Unit</th>
                <th className="pb-2 pr-4 w-28">Planting Rate</th>
                <th className="pb-2 pr-4 w-24 text-right">$/Acre</th>
                <th className="pb-2 pr-4 w-28 text-right">Total</th>
                <th className="pb-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {crop.seedTreatments.map(st => {
                const costs = calculateTreatmentCost(st);
                return (
                  <tr key={st.id} className="hover:bg-stone-50">
                    <td className="py-2 pr-4">
                      <select
                        value={st.productId}
                        onChange={(e) => handleUpdateTreatment(st.id, { productId: e.target.value })}
                        className="w-full px-2 py-1 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {products.filter(p => p.form === 'liquid').map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        value={st.ratePerCwt}
                        onChange={(e) => handleUpdateTreatment(st.id, { ratePerCwt: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        min={0}
                        step={0.1}
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        value={st.rateUnit}
                        onChange={(e) => handleUpdateTreatment(st.id, { rateUnit: e.target.value as 'oz' | 'g' })}
                        className="w-full px-2 py-1 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="oz">oz</option>
                        <option value="g">g</option>
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={st.plantingRateLbsPerAcre}
                          onChange={(e) => handleUpdateTreatment(st.id, { plantingRateLbsPerAcre: Number(e.target.value) })}
                          className="w-16 px-2 py-1 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          min={0}
                        />
                        <span className="text-xs text-stone-500">lbs/ac</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-right text-stone-600 text-sm">
                      {formatCurrency(costs.costPerAcre)}
                    </td>
                    <td className="py-2 pr-4 text-right font-medium text-emerald-600 text-sm">
                      {formatCurrency(costs.totalCost)}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleDeleteTreatment(st.id)}
                        className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && crop.seedTreatments.length > 0 && (
        <div className="px-6 pb-4">
          <button
            onClick={handleAddTreatment}
            className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add Another Treatment
          </button>
        </div>
      )}
    </div>
  );
};
