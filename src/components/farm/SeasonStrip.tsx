import React, { useMemo } from 'react';
import type { Crop, Product } from '@/types/farm';
import type { ProductPurpose } from '@/types/productIntelligence';
import { getTimingPhase, FUNCTION_CATEGORIES, getRoleFunctionCategory } from '@/lib/functionCategories';
import { calculateApplicationCostPerAcre, getApplicationAcresPercentage } from '@/lib/cropCalculations';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PhaseShape {
  cost: number;
  costPerAcre: number;
  avgAcresIntensity: number;
  dominantFunctions: { id: string; label: string; icon: string }[];
  passCount: number;
  productCount: number;
}

interface SeasonShape {
  early: PhaseShape;
  mid: PhaseShape;
  late: PhaseShape;
  maxPhaseCost: number;
}

interface SeasonStripProps {
  crop: Crop;
  products: Product[];
  purposes: Record<string, ProductPurpose>;
}

const emptyPhase = (): PhaseShape => ({
  cost: 0,
  costPerAcre: 0,
  avgAcresIntensity: 0,
  dominantFunctions: [],
  passCount: 0,
  productCount: 0,
});

const calculateSeasonShape = (
  crop: Crop,
  products: Product[],
  purposes: Record<string, ProductPurpose>
): SeasonShape => {
  const phases: Record<'early' | 'mid' | 'late', PhaseShape> = {
    early: emptyPhase(),
    mid: emptyPhase(),
    late: emptyPhase(),
  };

  const functionCounts: Record<'early' | 'mid' | 'late', Record<string, number>> = {
    early: {},
    mid: {},
    late: {},
  };

  const totalTimings = crop.applicationTimings.length;

  crop.applicationTimings.forEach((timing, idx) => {
    const phase = getTimingPhase(idx, totalTimings);
    const apps = crop.applications.filter(a => a.timingId === timing.id);
    
    phases[phase].passCount++;

    apps.forEach(app => {
      const product = products.find(p => p.id === app.productId);
      const acresPercentage = getApplicationAcresPercentage(app, crop);
      const acresTreated = crop.totalAcres * (acresPercentage / 100);
      const costPerAcre = calculateApplicationCostPerAcre(app, product);
      
      phases[phase].cost += costPerAcre * acresTreated;
      phases[phase].avgAcresIntensity += acresPercentage;
      phases[phase].productCount++;

      // Aggregate functions
      const purpose = purposes[app.productId];
      if (purpose?.roles) {
        purpose.roles.forEach(role => {
          const cat = getRoleFunctionCategory(role);
          if (cat) {
            functionCounts[phase][cat.id] = (functionCounts[phase][cat.id] || 0) + acresPercentage;
          }
        });
      }
    });
  });

  // Normalize acres intensity and get dominant functions
  (['early', 'mid', 'late'] as const).forEach(phase => {
    if (phases[phase].productCount > 0) {
      phases[phase].avgAcresIntensity = phases[phase].avgAcresIntensity / phases[phase].productCount;
      phases[phase].costPerAcre = crop.totalAcres > 0 ? phases[phase].cost / crop.totalAcres : 0;
    }

    // Get top 3 functions by weighted presence
    const sorted = Object.entries(functionCounts[phase])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    phases[phase].dominantFunctions = sorted.map(([id]) => {
      const cat = FUNCTION_CATEGORIES.find(c => c.id === id);
      return { id, label: cat?.label || id, icon: cat?.icon || '📦' };
    });
  });

  const maxPhaseCost = Math.max(phases.early.cost, phases.mid.cost, phases.late.cost, 1);

  return { ...phases, maxPhaseCost };
};

const PHASE_COLORS = {
  early: 'bg-emerald-500',
  mid: 'bg-amber-500',
  late: 'bg-sky-500',
};

const PHASE_LABELS = {
  early: 'Early',
  mid: 'Mid',
  late: 'Late',
};

export const SeasonStrip: React.FC<SeasonStripProps> = ({ crop, products, purposes }) => {
  const shape = useMemo(
    () => calculateSeasonShape(crop, products, purposes),
    [crop, products, purposes]
  );

  const hasData = shape.early.productCount + shape.mid.productCount + shape.late.productCount > 0;

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-16 bg-muted/30 rounded-lg border border-dashed border-border">
        <span className="text-sm text-muted-foreground">Add products to see season shape</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="bg-card/50 backdrop-blur rounded-lg border border-border/50 p-4">
        <div className="grid grid-cols-3 gap-3">
          {(['early', 'mid', 'late'] as const).map(phase => {
            const data = shape[phase];
            const barHeight = (data.cost / shape.maxPhaseCost) * 48;
            const opacity = 0.4 + (data.avgAcresIntensity / 100) * 0.6;
            const hasContent = data.productCount > 0;

            return (
              <Tooltip key={phase}>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center cursor-default">
                    {/* Phase Label */}
                    <span className="text-xs font-medium text-muted-foreground mb-2">
                      {PHASE_LABELS[phase]}
                    </span>

                    {/* Cost Bar */}
                    <div className="h-12 w-full flex items-end justify-center mb-2">
                      {hasContent ? (
                        <div
                          className={`w-full max-w-20 rounded-t ${PHASE_COLORS[phase]} transition-all`}
                          style={{
                            height: `${Math.max(barHeight, 4)}px`,
                            opacity,
                          }}
                        />
                      ) : (
                        <div className="w-full max-w-20 h-1 bg-muted rounded" />
                      )}
                    </div>

                    {/* Cost Label */}
                    <span className="text-xs text-muted-foreground mb-1">
                      {hasContent ? `$${Math.round(data.costPerAcre)}/ac` : '—'}
                    </span>

                    {/* Intensity Badge */}
                    {hasContent && (
                      <span className="text-[10px] text-muted-foreground/70 mb-2">
                        {Math.round(data.avgAcresIntensity)}% avg
                      </span>
                    )}

                    {/* Function Icons */}
                    <div className="flex items-center gap-1 min-h-5">
                      {data.dominantFunctions.map(fn => (
                        <span key={fn.id} className="text-sm" title={fn.label}>
                          {fn.icon}
                        </span>
                      ))}
                      {!hasContent && <span className="text-muted-foreground/40">—</span>}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-48">
                  <div className="text-xs space-y-1">
                    <div className="font-medium">{PHASE_LABELS[phase]} Season</div>
                    {hasContent ? (
                      <>
                        <div>Total: ${Math.round(data.cost).toLocaleString()}</div>
                        <div>{data.passCount} pass{data.passCount !== 1 ? 'es' : ''}, {data.productCount} product{data.productCount !== 1 ? 's' : ''}</div>
                        {data.dominantFunctions.length > 0 && (
                          <div className="pt-1 border-t border-border/50">
                            {data.dominantFunctions.map(fn => fn.label).join(' • ')}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-muted-foreground">No products planned</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
