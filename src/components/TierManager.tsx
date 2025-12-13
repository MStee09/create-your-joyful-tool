import React, { useState } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
import type { Crop, Tier } from '../types';
import { formatNumber, generateId } from '../lib/calculations';

interface TierManagerProps {
  crop: Crop;
  onUpdate: (crop: Crop) => void;
}

export const TierManager: React.FC<TierManagerProps> = ({ crop, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleUpdateTier = (tierId: string, updates: Partial<Tier>) => {
    onUpdate({
      ...crop,
      tiers: crop.tiers.map(t => t.id === tierId ? { ...t, ...updates } : t),
    });
  };

  const handleAddTier = () => {
    const newTier: Tier = {
      id: generateId(),
      name: `Tier ${crop.tiers.length + 1}`,
      percentage: 5,
    };
    onUpdate({
      ...crop,
      tiers: [...crop.tiers, newTier],
    });
  };

  const handleDeleteTier = (tierId: string) => {
    if (crop.tiers.length <= 1) return;
    
    // Remove tier and reassign applications to first tier
    const firstTierId = crop.tiers.find(t => t.id !== tierId)?.id;
    onUpdate({
      ...crop,
      tiers: crop.tiers.filter(t => t.id !== tierId),
      applications: crop.applications.map(a => 
        a.tierId === tierId ? { ...a, tierId: firstTierId || '' } : a
      ),
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone-50 rounded-xl"
      >
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-stone-400" />
          <div className="text-left">
            <h3 className="font-semibold text-stone-800">Tier Configuration</h3>
            <p className="text-sm text-stone-500">
              {crop.tiers.length} tiers configured
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-500">
          {crop.tiers.slice(0, 3).map(t => (
            <span key={t.id} className="px-2 py-1 bg-stone-100 rounded">
              {t.percentage}%
            </span>
          ))}
          {crop.tiers.length > 3 && <span>+{crop.tiers.length - 3}</span>}
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-stone-100">
          <div className="mt-4 space-y-3">
            {crop.tiers.map((tier, idx) => (
              <div key={tier.id} className="flex items-center gap-4">
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => handleUpdateTier(tier.id, { name: e.target.value })}
                  className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tier.percentage}
                    onChange={(e) => handleUpdateTier(tier.id, { percentage: Number(e.target.value) })}
                    className="w-20 px-3 py-2 border border-stone-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min={0}
                    max={100}
                  />
                  <span className="text-stone-500">%</span>
                </div>
                <div className="w-24 text-right text-sm text-stone-500">
                  {formatNumber(crop.totalAcres * (tier.percentage / 100), 0)} ac
                </div>
                <button
                  onClick={() => handleDeleteTier(tier.id)}
                  disabled={crop.tiers.length <= 1}
                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleAddTier}
            className="mt-4 flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add Tier
          </button>
        </div>
      )}
    </div>
  );
};
