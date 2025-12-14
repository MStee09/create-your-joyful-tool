import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/farmUtils';
import type { SeasonSummary } from '@/lib/cropCalculations';
import type { Crop, Product, CropType } from '@/types/farm';
import type { ProductPurpose } from '@/types/productIntelligence';
import { SeasonStrip } from './SeasonStrip';
import { FunctionCoverageBar } from './FunctionCoverageBar';
import { CropTypeSelector } from './CropTypeSelector';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SeasonOverviewBarProps {
  cropName: string;
  totalAcres: number;
  summary: SeasonSummary;
  crop: Crop;
  products: Product[];
  purposes: Record<string, ProductPurpose>;
  showInsights: boolean;
  onToggleInsights: () => void;
  onUpdateCropName?: (name: string) => void;
  onUpdateCropType?: (cropType: CropType) => void;
}

const StatusBadge: React.FC<{ status: SeasonSummary['status'] }> = ({ status }) => {
  const config = {
    'balanced': { label: 'Balanced', color: 'bg-emerald-100 text-emerald-700' },
    'heavy-early': { label: 'Early-heavy', color: 'bg-amber-100 text-amber-700' },
    'heavy-late': { label: 'Late-heavy', color: 'bg-blue-100 text-blue-700' },
    'skewed': { label: 'Skewed', color: 'bg-purple-100 text-purple-700' },
  };
  const { label, color } = config[status];
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
};

const IntensityDots: React.FC<{ intensity: number }> = ({ intensity }) => {
  const filled = Math.round(intensity);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i <= filled ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
};

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
          className="bg-amber-500 transition-all" 
          style={{ width: `${midPct}%` }} 
          title={`Mid: ${formatNumber(mid, 1)}`}
        />
        <div 
          className="bg-blue-500 transition-all" 
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
  crop,
  products,
  purposes,
  showInsights,
  onToggleInsights,
  onUpdateCropName,
  onUpdateCropType,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(cropName);

  const handleSaveName = () => {
    if (nameValue.trim() && onUpdateCropName) {
      onUpdateCropName(nameValue.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div className="bg-card border-b border-border sticky top-0 z-10">
      {/* Compact Header Row */}
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Left: Crop name + status */}
        <div className="flex items-center gap-3">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') { setIsEditingName(false); setNameValue(cropName); }
                }}
                className="px-2 py-1 border border-input rounded text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="p-1 text-primary hover:bg-primary/10 rounded"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setIsEditingName(false); setNameValue(cropName); }}
                className="p-1 text-muted-foreground hover:bg-muted rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <h2 className="text-xl font-bold text-foreground">{cropName}</h2>
              {onUpdateCropName && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground rounded transition-opacity"
                  title="Rename crop"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          <StatusBadge status={summary.status} />
          
          {/* Crop Type Selector */}
          {onUpdateCropType && (
            <CropTypeSelector
              value={crop.cropType}
              onChange={onUpdateCropType}
              className="w-32 h-8 text-sm"
            />
          )}
        </div>

        {/* Center: Key metrics inline */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-primary">{formatCurrency(summary.totalCost)}</span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-sm text-muted-foreground">{formatCurrency(summary.costPerAcre)}/ac</span>
          </div>
          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-sm text-foreground">{formatNumber(totalAcres, 0)} ac</span>
          <span className="text-muted-foreground text-sm">·</span>
          <IntensityDots intensity={summary.programIntensity} />
        </div>

        {/* Right: Inline nutrients + toggle */}
        <div className="flex items-center gap-4">
          {/* Compact nutrient totals */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              N <span className="font-medium text-foreground">{formatNumber(summary.nutrients.n, 1)}</span>
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              P <span className="font-medium text-foreground">{formatNumber(summary.nutrients.p, 1)}</span>
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              K <span className="font-medium text-foreground">{formatNumber(summary.nutrients.k, 1)}</span>
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              S <span className="font-medium text-foreground">{formatNumber(summary.nutrients.s, 1)}</span>
            </span>
          </div>

          {/* Toggle button */}
          <button
            onClick={onToggleInsights}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            {showInsights ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Hide Insights</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Insights</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Insights Panel */}
      <Collapsible open={showInsights} onOpenChange={onToggleInsights}>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-6 pb-4 space-y-4 border-t border-border pt-4 bg-muted/30">
            {/* Season Strip */}
            <SeasonStrip crop={crop} products={products} purposes={purposes} />

            {/* Function Coverage */}
            <FunctionCoverageBar crop={crop} products={products} purposes={purposes} />

            {/* Nutrient Timing Detail */}
            <div className="flex items-center gap-8">
              <div className="flex-1 max-w-md space-y-1">
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
                  <div className="w-3 h-2 bg-amber-500 rounded" />
                  <span>Mid</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2 bg-blue-500 rounded" />
                  <span>Late</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
