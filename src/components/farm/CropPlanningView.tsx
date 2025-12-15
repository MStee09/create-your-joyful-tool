import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Check, X, Trash2, Settings, Layers, Focus, ArrowRight, Snowflake, Sprout, Sun, CloudSnow, ChevronDown, ChevronRight } from 'lucide-react';
import type { Crop, Product, Vendor, InventoryItem, Application, ApplicationTiming, TimingBucket } from '@/types/farm';
import type { ProductMaster, PriceBookEntry } from '@/types';
import { formatNumber, generateId } from '@/utils/farmUtils';
import { SeasonOverviewBar } from './SeasonOverviewBar';
import { PassCard } from './PassCard';
import { EntryModePanel } from './EntryModePanel';
import { calculateSeasonSummary, calculatePassSummary, calculateSeasonSummaryWithPriceBook, calculatePassSummaryWithPriceBook, PriceBookContext } from '@/lib/cropCalculations';
import { useProductIntelligence } from '@/hooks/useProductIntelligence';
import { getStageOrder, TIMING_BUCKET_INFO, inferTimingBucket, inferGrowthStage } from '@/lib/growthStages';

// Phase configuration for timeline
const PHASE_CONFIG: Record<TimingBucket, {
  icon: React.ElementType;
  label: string;
  accent: string;
  light: string;
  text: string;
  border: string;
}> = {
  'PRE_PLANT': { 
    icon: Snowflake, 
    label: 'Pre-Plant', 
    accent: 'bg-amber-500', 
    light: 'bg-amber-50 dark:bg-amber-950/30', 
    text: 'text-amber-700 dark:text-amber-400', 
    border: 'border-amber-200 dark:border-amber-800' 
  },
  'AT_PLANTING': { 
    icon: Sprout, 
    label: 'At Planting', 
    accent: 'bg-emerald-500', 
    light: 'bg-emerald-50 dark:bg-emerald-950/30', 
    text: 'text-emerald-700 dark:text-emerald-400', 
    border: 'border-emerald-200 dark:border-emerald-800' 
  },
  'IN_SEASON': { 
    icon: Sun, 
    label: 'In-Season', 
    accent: 'bg-blue-500', 
    light: 'bg-blue-50 dark:bg-blue-950/30', 
    text: 'text-blue-700 dark:text-blue-400', 
    border: 'border-blue-200 dark:border-blue-800' 
  },
  'POST_HARVEST': { 
    icon: CloudSnow, 
    label: 'Post-Harvest', 
    accent: 'bg-purple-500', 
    light: 'bg-purple-50 dark:bg-purple-950/30', 
    text: 'text-purple-700 dark:text-purple-400', 
    border: 'border-purple-200 dark:border-purple-800' 
  },
};

const PHASE_ORDER: TimingBucket[] = ['PRE_PLANT', 'AT_PLANTING', 'IN_SEASON', 'POST_HARVEST'];

interface CropPlanningViewProps {
  crop: Crop;
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  productMasters: ProductMaster[];
  priceBook: PriceBookEntry[];
  seasonYear: number;
  onUpdate: (crop: Crop) => void;
  onDelete: () => void;
}

export const CropPlanningView: React.FC<CropPlanningViewProps> = ({
  crop,
  products,
  vendors,
  inventory,
  productMasters,
  priceBook,
  seasonYear,
  onUpdate,
  onDelete,
}) => {
  const [editingAcres, setEditingAcres] = useState(false);
  const [acresValue, setAcresValue] = useState(crop.totalAcres);
  const [showAddTiming, setShowAddTiming] = useState(false);
  const [newTimingName, setNewTimingName] = useState('');
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [showTierManager, setShowTierManager] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  // Timeline state
  const [viewMode, setViewMode] = useState<'full' | 'focus'>('full');
  const [activePhase, setActivePhase] = useState<TimingBucket>('IN_SEASON');
  const [collapsedPhases, setCollapsedPhases] = useState<Set<TimingBucket>>(new Set());

  const { purposes } = useProductIntelligence();

  // Build price book context for cost calculations
  const priceBookContext: PriceBookContext = useMemo(() => ({
    productMasters,
    priceBook,
    seasonYear,
  }), [productMasters, priceBook, seasonYear]);

  const summary = useMemo(() => 
    calculateSeasonSummaryWithPriceBook(crop, products, priceBookContext),
    [crop, products, priceBookContext]
  );

  // Sort timings by bucket then growth stage
  const sortedTimings = useMemo(() => {
    return crop.applicationTimings
      .slice()
      .sort((a, b) => {
        const bucketOrderA = TIMING_BUCKET_INFO[a.timingBucket || 'IN_SEASON'].order;
        const bucketOrderB = TIMING_BUCKET_INFO[b.timingBucket || 'IN_SEASON'].order;
        if (bucketOrderA !== bucketOrderB) return bucketOrderA - bucketOrderB;
        
        if ((a.timingBucket || 'IN_SEASON') === 'IN_SEASON') {
          const stageOrderA = getStageOrder(crop.cropType, a.growthStageStart);
          const stageOrderB = getStageOrder(crop.cropType, b.growthStageStart);
          if (stageOrderA !== stageOrderB) return stageOrderA - stageOrderB;
        }
        
        return a.order - b.order;
      });
  }, [crop.applicationTimings, crop.cropType]);

  // Group timings by phase
  const timingsByPhase = useMemo(() => {
    const grouped: Record<TimingBucket, ApplicationTiming[]> = {
      'PRE_PLANT': [],
      'AT_PLANTING': [],
      'IN_SEASON': [],
      'POST_HARVEST': [],
    };
    
    sortedTimings.forEach(timing => {
      const bucket = timing.timingBucket || 'IN_SEASON';
      grouped[bucket].push(timing);
    });
    
    return grouped;
  }, [sortedTimings]);

  // Calculate cost per phase using price book-aware calculations
  const phaseCosts = useMemo(() => {
    const costs: Record<TimingBucket, number> = {
      'PRE_PLANT': 0,
      'AT_PLANTING': 0,
      'IN_SEASON': 0,
      'POST_HARVEST': 0,
    };
    
    sortedTimings.forEach(timing => {
      const bucket = timing.timingBucket || 'IN_SEASON';
      const passSummary = calculatePassSummaryWithPriceBook(timing, crop, products, priceBookContext);
      // Use costPerFieldAcre - the field-weighted cost that rolls up to budget
      costs[bucket] += passSummary.costPerFieldAcre;
    });
    
    return costs;
  }, [sortedTimings, crop, products, priceBookContext]);

  // Handlers
  const handleSaveAcres = () => {
    onUpdate({ ...crop, totalAcres: acresValue });
    setEditingAcres(false);
  };

  const handleAddTiming = () => {
    if (!newTimingName.trim()) return;
    
    // Infer timing bucket and growth stage from name
    const inferredBucket = inferTimingBucket(newTimingName);
    const inferredStages = inferGrowthStage(newTimingName, crop.cropType);
    
    const newTiming: ApplicationTiming = {
      id: generateId(),
      name: newTimingName.trim(),
      order: crop.applicationTimings.length,
      timingBucket: inferredBucket,
      growthStageStart: inferredBucket === 'IN_SEASON' ? inferredStages.start : undefined,
      growthStageEnd: inferredBucket === 'IN_SEASON' ? inferredStages.end : undefined,
    };
    onUpdate({
      ...crop,
      applicationTimings: [...crop.applicationTimings, newTiming],
    });
    setShowAddTiming(false);
    setNewTimingName('');
  };

  const handleDuplicateTiming = (timingId: string) => {
    const original = crop.applicationTimings.find(t => t.id === timingId);
    if (!original) return;

    const newTiming: ApplicationTiming = {
      id: generateId(),
      name: `${original.name} (Copy)`,
      order: original.order + 0.5, // Insert right after original, will be normalized
      timingBucket: original.timingBucket,
      growthStageStart: original.growthStageStart,
      growthStageEnd: original.growthStageEnd,
    };

    // Duplicate all applications from the original timing
    const originalApps = crop.applications.filter(a => a.timingId === timingId);
    const newApps = originalApps.map(app => ({
      ...app,
      id: generateId(),
      timingId: newTiming.id,
    }));

    // Normalize order values
    const updatedTimings = [...crop.applicationTimings, newTiming]
      .sort((a, b) => a.order - b.order)
      .map((t, idx) => ({ ...t, order: idx }));

    onUpdate({
      ...crop,
      applicationTimings: updatedTimings,
      applications: [...crop.applications, ...newApps],
    });
  };

  const handleDeleteTiming = (timingId: string) => {
    onUpdate({
      ...crop,
      applicationTimings: crop.applicationTimings.filter(t => t.id !== timingId),
      applications: crop.applications.filter(a => a.timingId !== timingId),
    });
  };

  const handleUpdateTiming = (updatedTiming: ApplicationTiming) => {
    onUpdate({
      ...crop,
      applicationTimings: crop.applicationTimings.map(t => 
        t.id === updatedTiming.id ? updatedTiming : t
      ),
    });
  };

  const handleAddApplication = (timingId: string) => {
    const newApp: Application = {
      id: generateId(),
      timingId,
      productId: products[0]?.id || '',
      rate: 0,
      rateUnit: 'oz',
      tierId: crop.tiers[0]?.id || '',
      acresPercentage: 100,
    };
    onUpdate({
      ...crop,
      applications: [...crop.applications, newApp],
    });
    setEditingApplication(newApp);
  };

  const handleSaveApplication = (app: Application) => {
    onUpdate({
      ...crop,
      applications: crop.applications.map(a => a.id === app.id ? app : a),
    });
    setEditingApplication(null);
  };

  const handleDeleteApplication = (appId: string) => {
    onUpdate({
      ...crop,
      applications: crop.applications.filter(a => a.id !== appId),
    });
  };

  const togglePhaseCollapse = (phase: TimingBucket) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Season Overview Bar */}
      <SeasonOverviewBar
        cropName={crop.name}
        totalAcres={crop.totalAcres}
        summary={summary}
        crop={crop}
        products={products}
        purposes={purposes}
        showInsights={showInsights}
        onToggleInsights={() => setShowInsights(!showInsights)}
        onUpdateCropName={(name) => onUpdate({ ...crop, name })}
        onUpdateCropType={(cropType) => onUpdate({ ...crop, cropType })}
      />

      {/* Timeline Navigation Bar */}
      <div className="bg-card border-b border-border px-6 py-4">
        {/* View Toggle + Settings Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('full')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'full' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="w-4 h-4" />
                Full Season
              </button>
              <button
                onClick={() => setViewMode('focus')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'focus' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Focus className="w-4 h-4" />
                Focus Phase
              </button>
            </div>

            {/* Acres Editor */}
            {editingAcres ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={acresValue}
                  onChange={(e) => setAcresValue(Number(e.target.value))}
                  className="w-24 px-3 py-1 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                <span className="text-muted-foreground">acres</span>
                <button onClick={handleSaveAcres} className="p-1 text-primary hover:bg-primary/10 rounded">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditingAcres(false); setAcresValue(crop.totalAcres); }} className="p-1 text-muted-foreground hover:bg-muted rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingAcres(true)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <span>{formatNumber(crop.totalAcres, 0)} acres</span>
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <button
            onClick={() => setShowTierManager(!showTierManager)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Tier Presets
          </button>
        </div>

        {/* Horizontal Timeline */}
        <div className="flex items-center gap-2">
          {PHASE_ORDER.map((phase, idx) => {
            const config = PHASE_CONFIG[phase];
            const Icon = config.icon;
            const phaseCost = phaseCosts[phase];
            const passCount = timingsByPhase[phase].length;
            const isActive = activePhase === phase && viewMode === 'focus';
            const hasTimings = passCount > 0;

            return (
              <React.Fragment key={phase}>
                <button
                  onClick={() => {
                    setActivePhase(phase);
                    if (viewMode === 'full') {
                      togglePhaseCollapse(phase);
                    }
                  }}
                  className={`flex-1 rounded-xl p-3 transition-all ${
                    isActive 
                      ? `${config.accent} text-white shadow-lg scale-[1.02]` 
                      : hasTimings
                        ? `${config.light} hover:scale-[1.01] border ${config.border}`
                        : 'bg-muted/50 hover:bg-muted border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : hasTimings ? config.text : 'text-muted-foreground'}`} />
                    <span className={`font-semibold text-sm ${isActive ? 'text-white' : hasTimings ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {config.label}
                    </span>
                  </div>
                  <div className={`text-center ${isActive ? 'text-white/90' : hasTimings ? 'text-foreground' : 'text-muted-foreground'}`}>
                    <span className="font-bold">${phaseCost.toFixed(0)}</span>
                    <span className="text-xs">/ac</span>
                  </div>
                  <div className={`text-center text-xs mt-1 ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {passCount} pass{passCount !== 1 ? 'es' : ''}
                  </div>
                </button>
                
                {idx < PHASE_ORDER.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-muted-foreground/30 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Tier Presets Manager */}
        {showTierManager && (
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Tier Presets</h4>
            <p className="text-sm text-muted-foreground mb-3">
              These presets appear as quick-fill buttons when editing applications.
            </p>
            <div className="flex flex-wrap gap-2">
              {crop.tiers.map(tier => (
                <div key={tier.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{tier.name}</span>
                  <input
                    type="number"
                    value={tier.percentage}
                    onChange={(e) => onUpdate({
                      ...crop,
                      tiers: crop.tiers.map(t => 
                        t.id === tier.id ? { ...t, percentage: Number(e.target.value) } : t
                      ),
                    })}
                    className="w-14 px-2 py-1 text-center border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    min={0}
                    max={100}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pass Cards */}
        {crop.applicationTimings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No application timings yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Add your first timing to start building your crop plan
            </p>
          </div>
        ) : viewMode === 'full' ? (
          /* FULL SEASON VIEW */
          <div className="space-y-6">
            {PHASE_ORDER.map((phase) => {
              const config = PHASE_CONFIG[phase];
              const Icon = config.icon;
              const timings = timingsByPhase[phase];
              const phaseCost = phaseCosts[phase];
              const isCollapsed = collapsedPhases.has(phase);
              
              if (timings.length === 0) return null;
              
              return (
                <div key={phase}>
                  {/* Phase Header */}
                  <button
                    onClick={() => togglePhaseCollapse(phase)}
                    className="w-full flex items-center justify-between mb-3 group"
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed ? (
                        <ChevronRight className={`w-5 h-5 ${config.text}`} />
                      ) : (
                        <ChevronDown className={`w-5 h-5 ${config.text}`} />
                      )}
                      <div className={`w-8 h-8 rounded-lg ${config.accent} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`font-bold ${config.text}`}>{config.label}</span>
                      <span className="text-muted-foreground text-sm">({timings.length} passes)</span>
                    </div>
                    <span className={`font-bold ${config.text}`}>${phaseCost.toFixed(2)}/ac</span>
                  </button>
                  
                  {/* Existing PassCard components */}
                  {!isCollapsed && (
                    <div className="space-y-4">
                      {timings.map((timing, idx) => (
                        <PassCard
                          key={timing.id}
                          timing={timing}
                          crop={crop}
                          products={products}
                          vendors={vendors}
                          purposes={purposes}
                          productMasters={productMasters}
                          priceBook={priceBook}
                          seasonYear={seasonYear}
                          onEditApplication={setEditingApplication}
                          onAddApplication={handleAddApplication}
                          onDuplicateTiming={handleDuplicateTiming}
                          onDeleteTiming={handleDeleteTiming}
                          onUpdateTiming={handleUpdateTiming}
                          defaultExpanded={idx === 0}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* FOCUS VIEW */
          (() => {
            const config = PHASE_CONFIG[activePhase];
            const Icon = config.icon;
            const timings = timingsByPhase[activePhase];
            const phaseCost = phaseCosts[activePhase];
            
            return (
              <div>
                {/* Phase Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${config.accent} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-lg font-bold ${config.text}`}>{config.label}</h2>
                      <p className="text-muted-foreground text-sm">{timings.length} passes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${config.text}`}>${phaseCost.toFixed(2)}</div>
                    <div className="text-muted-foreground text-sm">/acre</div>
                  </div>
                </div>

                {/* Existing PassCard components */}
                {timings.length === 0 ? (
                  <div className="text-center py-12 bg-muted/30 rounded-xl">
                    <p className="text-muted-foreground">No passes in this phase yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timings.map((timing, idx) => (
                      <PassCard
                        key={timing.id}
                        timing={timing}
                        crop={crop}
                        products={products}
                        vendors={vendors}
                        purposes={purposes}
                        productMasters={productMasters}
                        priceBook={priceBook}
                        seasonYear={seasonYear}
                        onEditApplication={setEditingApplication}
                        onAddApplication={handleAddApplication}
                        onDuplicateTiming={handleDuplicateTiming}
                        onDeleteTiming={handleDeleteTiming}
                        onUpdateTiming={handleUpdateTiming}
                        defaultExpanded={idx === 0}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()
        )}

        {/* Add Timing */}
        {showAddTiming ? (
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Timing name (e.g., In Furrow, V6 Foliar, R2)"
                value={newTimingName}
                onChange={(e) => setNewTimingName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTiming()}
                className="flex-1 px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                autoFocus
              />
              <button
                onClick={handleAddTiming}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Add Timing
              </button>
              <button
                onClick={() => { setShowAddTiming(false); setNewTimingName(''); }}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTiming(true)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Application Timing
          </button>
        )}

        {/* Season Summary */}
        <div className="bg-card rounded-xl border border-border p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">
              <span className="font-semibold text-foreground">{crop.applicationTimings.length}</span> passes · 
              <span className="font-semibold text-foreground"> {PHASE_ORDER.filter(p => timingsByPhase[p].length > 0).length}</span> phases
            </div>
            <div>
              <span className="text-muted-foreground">Season Total: </span>
              <span className="font-bold text-primary text-lg">${formatNumber(summary.costPerAcre, 2)}/ac</span>
              <span className="text-muted-foreground ml-2">(${formatNumber(summary.totalCost, 0)})</span>
            </div>
          </div>
        </div>

        {/* Delete Crop */}
        <div className="mt-8 pt-8 border-t border-border">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Crop
          </button>
        </div>
      </div>

      {/* Entry Mode Panel */}
      {editingApplication && (
        <EntryModePanel
          application={editingApplication}
          crop={crop}
          products={products}
          onSave={handleSaveApplication}
          onDelete={handleDeleteApplication}
          onClose={() => setEditingApplication(null)}
        />
      )}
    </div>
  );
};
