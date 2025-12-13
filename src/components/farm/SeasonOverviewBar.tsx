import React from 'react';
import { formatCurrency, formatNumber } from '@/utils/farmUtils';
import type { SeasonSummary } from '@/lib/cropCalculations';

interface SeasonOverviewBarProps {
  cropName: string;
  totalAcres: number;
  summary: SeasonSummary;
}

const StatusBadge: React.FC<{ status: SeasonSummary['status'] }> = ({ status }) => {
  const config = {
    'balanced': { label: 'Balanced', color: 'bg-emerald-100 text-emerald-700' },
    'heavy-early': { label: 'Heavy Early', color: 'bg-amber-100 text-amber' },
    'heavy-late': { label: 'Heavy Late', color: 'bg-blue-100 text-blue' },
    'skewed': { label: 'Skewed', color: 'bg-purple-100 text-purple' },
  };
  const { label, color } = config[status];
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
};

const IntensityBar: React.FC<{ intensity: number }> = ({ intensity }) => {
  const filled = Math.round(intensity);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-3 h-3 rounded-sm ${
            i <= filled ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
};

const NutrientTile: React.FC<{ label: string; value: number; timing?: string }> = ({ 
  label, 
  value,
  timing 
}) => (
  <div className="text-center px-4">
    <p className="text-lg font-semibold text-foreground">{formatNumber(value, 1)}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
    {timing && (
      <p className="text-xs text-muted-foreground/70 mt-0.5">{timing}</p>
    )}
  </div>
);

const NutrientTimingBar: React.FC<{ 
  early: number; 
  mid: number; 
  late: number;
  label: string;
}> = ({ early, mid, late, label }) => {
  const total = early + mid + late;
  if (total === 0) return null;
  
  const earlyPct = (early / total) * 100;
  const midPct = (mid / total) * 100;
  const latePct = (late / total) * 100;
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-4">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
        <div 
          className="bg-emerald-500 transition-all" 
          style={{ width: `${earlyPct}%` }} 
          title={`Early: ${formatNumber(early, 1)}`}
        />
        <div 
          className="bg-amber transition-all" 
          style={{ width: `${midPct}%` }} 
          title={`Mid: ${formatNumber(mid, 1)}`}
        />
        <div 
          className="bg-blue transition-all" 
          style={{ width: `${latePct}%` }} 
          title={`Late: ${formatNumber(late, 1)}`}
        />
      </div>
    </div>
  );
};

export const SeasonOverviewBar: React.FC<SeasonOverviewBarProps> = ({
  cropName,
  totalAcres,
  summary,
}) => {
  const getNutrientTiming = (nutrient: 'n' | 'p' | 'k' | 's') => {
    const { early, mid, late } = summary.nutrientTiming;
    const total = early[nutrient] + mid[nutrient] + late[nutrient];
    if (total === 0) return '';
    
    const earlyPct = early[nutrient] / total;
    const latePct = late[nutrient] / total;
    
    if (earlyPct > 0.6) return 'Early-heavy';
    if (latePct > 0.6) return 'Late-heavy';
    return '';
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm sticky top-0 z-10">
      {/* Top row: Crop name and key metrics */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-foreground">{cropName}</h2>
            <StatusBadge status={summary.status} />
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{formatCurrency(summary.totalCost)}</p>
              <p className="text-sm text-muted-foreground">Total Cost</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-foreground">{formatCurrency(summary.costPerAcre)}/ac</p>
              <p className="text-sm text-muted-foreground">Avg Cost</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-foreground">{formatNumber(totalAcres, 0)}</p>
              <p className="text-sm text-muted-foreground">Acres</p>
            </div>
            <div className="text-right">
              <IntensityBar intensity={summary.programIntensity} />
              <p className="text-sm text-muted-foreground mt-1">Intensity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Nutrients and timing visualization */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center divide-x divide-border">
          <NutrientTile 
            label="N" 
            value={summary.nutrients.n} 
            timing={getNutrientTiming('n')}
          />
          <NutrientTile 
            label="P" 
            value={summary.nutrients.p} 
            timing={getNutrientTiming('p')}
          />
          <NutrientTile 
            label="K" 
            value={summary.nutrients.k} 
            timing={getNutrientTiming('k')}
          />
          <NutrientTile 
            label="S" 
            value={summary.nutrients.s} 
            timing={getNutrientTiming('s')}
          />
        </div>

        {/* Nutrient timing strips */}
        <div className="flex-1 max-w-xs ml-8 space-y-1">
          <NutrientTimingBar 
            label="N" 
            early={summary.nutrientTiming.early.n}
            mid={summary.nutrientTiming.mid.n}
            late={summary.nutrientTiming.late.n}
          />
          <NutrientTimingBar 
            label="S" 
            early={summary.nutrientTiming.early.s}
            mid={summary.nutrientTiming.mid.s}
            late={summary.nutrientTiming.late.s}
          />
        </div>

        {/* Timing legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-emerald-500 rounded" />
            <span>Early</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-amber rounded" />
            <span>Mid</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-blue rounded" />
            <span>Late</span>
          </div>
        </div>
      </div>
    </div>
  );
};
