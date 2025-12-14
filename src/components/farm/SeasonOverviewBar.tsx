import React, { useState, useEffect, useRef } from 'react';
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
  
  // Track cost changes for animation feedback
  const [isHighlighted, setIsHighlighted] = useState(false);
  const prevCostRef = useRef(summary.totalCost);
  
  useEffect(() => {
    if (summary.totalCost !== prevCostRef.current) {
      setIsHighlighted(true);
      prevCostRef.current = summary.totalCost;
      const timer = setTimeout(() => setIsHighlighted(false), 600);
      return () => clearTimeout(timer);
    }
  }, [summary.totalCost]);

  const handleSaveName = () => {
    if (nameValue.trim() && onUpdateCropName) {
      onUpdateCropName(nameValue.trim());
    }
    setIsEditingName(false);
  };

  // Format total cost as whole dollars for cleaner hero display
  const formattedTotalCost = formatCurrency(summary.totalCost, 0);

  return (
    <div className="bg-card border-b border-border sticky top-0 z-10">
      {/* Main Header - Restructured for visual hierarchy */}
      <div className="px-6 py-4 flex justify-between items-start">
        
        {/* Left Column: Crop identity + Hero cost + Supporting metrics */}
        <div className="space-y-2">
          {/* Row 1: Crop name + status + type selector */}
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
                  className="px-2 py-1 border border-input rounded text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary bg-background"
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
                <h2 className="text-lg font-semibold text-foreground">{cropName}</h2>
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
                className="w-32 h-7 text-sm"
              />
            )}
          </div>

          {/* Row 2: HERO - Total Crop Cost */}
          <div>
            <p 
              className={`text-3xl font-bold text-primary transition-all duration-300 ${
                isHighlighted ? 'scale-[1.02] brightness-110' : ''
              }`}
            >
              {formattedTotalCost}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
              Total Crop Cost
            </p>
          </div>

          {/* Row 3: Supporting metrics */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{formatCurrency(summary.costPerAcre)}/ac</span>
            <span className="text-muted-foreground/50">·</span>
            <span>{formatNumber(totalAcres, 0)} ac</span>
            <span className="text-muted-foreground/50">·</span>
            <div className="flex items-center gap-1.5">
              <IntensityDots intensity={summary.programIntensity} />
              <span className="text-xs">Intensity</span>
            </div>
          </div>
        </div>

        {/* Right Column: Nutrients (quieter) + Insights toggle */}
        <div className="flex flex-col items-end gap-3">
          {/* Compact nutrient totals - quieter styling */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              N <span className="font-medium text-foreground/80">{formatNumber(summary.nutrients.n, 1)}</span>
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>
              P <span className="font-medium text-foreground/80">{formatNumber(summary.nutrients.p, 1)}</span>
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>
              K <span className="font-medium text-foreground/80">{formatNumber(summary.nutrients.k, 1)}</span>
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>
              S <span className="font-medium text-foreground/80">{formatNumber(summary.nutrients.s, 1)}</span>
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
