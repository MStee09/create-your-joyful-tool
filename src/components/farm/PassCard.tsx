import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Copy, Trash2, GripVertical, AlertCircle, Edit2, Check, X, Clock, Award, Zap, AlertTriangle } from 'lucide-react';
import type { ApplicationTiming, Application, Crop, Product, Vendor, InventoryItem } from '@/types/farm';
import type { ProductMaster, PriceBookEntry } from '@/types';
import type { ProductPurpose, ApplicationOverride } from '@/types/productIntelligence';
import type { FieldCropOverride } from '@/types/field';
import { formatCurrency, formatNumber } from '@/utils/farmUtils';
import { ProductRowReadable } from './ProductRowReadable';
import { calculatePassSummary, calculatePassSummaryWithPriceBook, getApplicationAcresPercentage, type CoverageGroup, type PassPattern, type PriceBookContext } from '@/lib/cropCalculations';
import { FUNCTION_CATEGORIES, getRoleFunctionCategory } from '@/lib/functionCategories';
import { getTimingDisplayText } from '@/lib/growthStages';
import { TimingEditorPopover } from './TimingEditorPopover';
import { hasAwardedPrice } from '@/lib/priceBookUtils';
import { cn } from '@/lib/utils';
import { getPassType, PASS_TYPE_CONFIG } from '@/lib/passTypeUtils';

interface PassCardProps {
  timing: ApplicationTiming;
  crop: Crop;
  products: Product[];
  vendors?: Vendor[];
  inventory?: InventoryItem[];
  purposes?: Record<string, ProductPurpose>;
  applicationOverrides?: Record<string, ApplicationOverride>;
  productMasters?: ProductMaster[];
  priceBook?: PriceBookEntry[];
  seasonYear?: number;
  onEditApplication: (app: Application) => void;
  onAddApplication: (timingId: string) => void;
  onDuplicateTiming: (timingId: string) => void;
  onDeleteTiming: (timingId: string) => void;
  onUpdateTiming?: (timing: ApplicationTiming) => void;
  onUpdateApplicationOverride?: (override: ApplicationOverride) => void;
  defaultExpanded?: boolean;
  fieldOverrides?: FieldCropOverride[];
}

// Function category chip styles
const FUNCTION_CHIP_STYLES: Record<string, { bg: string; text: string }> = {
  'Rooting': { bg: 'bg-orange-500/15', text: 'text-orange-600' },
  'Carbon & Biology': { bg: 'bg-amber-500/15', text: 'text-amber-600' },
  'N Efficiency': { bg: 'bg-lime-500/15', text: 'text-lime-600' },
  'Stress': { bg: 'bg-rose-500/15', text: 'text-rose-600' },
  'Fertility': { bg: 'bg-emerald-500/15', text: 'text-emerald-600' },
  'Uptake': { bg: 'bg-blue-500/15', text: 'text-blue-600' },
  'Water & Adj': { bg: 'bg-sky-500/15', text: 'text-sky-600' },
};

// Pass pattern badge styles
const PATTERN_BADGE_STYLES: Record<PassPattern, { bg: string; text: string; label: string }> = {
  'uniform': { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Uniform' },
  'selective': { bg: 'bg-amber-500/15', text: 'text-amber-600', label: 'Selective' },
  'trial': { bg: 'bg-violet-500/15', text: 'text-violet-600', label: 'Trial' },
};

// Coverage label based on percentage (matching ProductRowReadable logic)
const getCoverageLabel = (percentage: number): 'Core' | 'Building' | 'Trial' => {
  if (percentage >= 90) return 'Core';
  if (percentage >= 50) return 'Building';
  return 'Trial';
};

// Tier badge styles for coverage distribution
const TIER_LABEL_STYLES: Record<string, { bg: string; text: string }> = {
  'Core': { bg: 'bg-emerald-500/15', text: 'text-emerald-600' },
  'Building': { bg: 'bg-amber-500/15', text: 'text-amber-600' },
  'Trial': { bg: 'bg-violet-500/15', text: 'text-violet-600' },
};

// Coverage distribution display - aggregated by tier
const CoverageDistribution: React.FC<{ 
  coverageGroups: CoverageGroup[]; 
  totalProducts: number;
  totalAcres: number;
}> = ({ coverageGroups, totalProducts, totalAcres }) => {
  if (coverageGroups.length === 0) return null;
  
  // Aggregate products by tier label (not by exact percentage)
  const tierCounts = coverageGroups.reduce((acc, g) => {
    const label = getCoverageLabel(g.acresPercentage);
    acc[label] = (acc[label] || 0) + g.applications.length;
    return acc;
  }, {} as Record<string, number>);
  
  // Get max acres treated from coverage groups
  const maxAcresTreated = coverageGroups.length > 0 
    ? Math.max(...coverageGroups.map(g => g.acresTreated))
    : totalAcres;
  
  const tiers = Object.entries(tierCounts) as [string, number][];
  
  // Single tier - simple display with acres
  if (tiers.length === 1) {
    const [label, count] = tiers[0];
    const style = TIER_LABEL_STYLES[label];
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', style.bg, style.text)}>
          {label}
        </span>
        {count} product{count !== 1 ? 's' : ''} · {formatNumber(maxAcresTreated, 0)} ac
      </span>
    );
  }
  
  // Multiple tiers - compact badges with counts
  const tierOrder = ['Core', 'Building', 'Trial'];
  const sortedTiers = tiers.sort((a, b) => 
    tierOrder.indexOf(a[0]) - tierOrder.indexOf(b[0])
  );
  
  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      {sortedTiers.map(([label, count]) => {
        const style = TIER_LABEL_STYLES[label];
        return (
          <span key={label} className="flex items-center gap-1">
            <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', style.bg, style.text)}>
              {label}
            </span>
            <span className="text-foreground/70">{count}</span>
          </span>
        );
      })}
      <span>· {formatNumber(maxAcresTreated, 0)} ac</span>
    </span>
  );
};

export const PassCard: React.FC<PassCardProps> = ({
  timing,
  crop,
  products,
  vendors = [],
  inventory = [],
  purposes = {},
  applicationOverrides = {},
  productMasters = [],
  priceBook = [],
  seasonYear = new Date().getFullYear(),
  onEditApplication,
  onAddApplication,
  onDuplicateTiming,
  onDeleteTiming,
  onUpdateTiming,
  onUpdateApplicationOverride,
  defaultExpanded = false,
  fieldOverrides = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(timing.name);

  const handleSaveName = () => {
    if (nameValue.trim() && onUpdateTiming) {
      onUpdateTiming({ ...timing, name: nameValue.trim() });
    }
    setIsEditingName(false);
  };
  
  // Build price book context if available
  const priceBookContext: PriceBookContext | undefined = productMasters.length > 0 && priceBook.length > 0 
    ? { productMasters, priceBook, seasonYear }
    : undefined;
  
  const summary = priceBookContext 
    ? calculatePassSummaryWithPriceBook(timing, crop, products, priceBookContext)
    : calculatePassSummary(timing, crop, products);
  
  // Count products with awarded bid prices in this pass
  const awardedProductsCount = React.useMemo(() => {
    return summary.applications.reduce((count, app) => {
      if (hasAwardedPrice(app.productId, seasonYear, productMasters, priceBook)) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [summary.applications, seasonYear, productMasters, priceBook]);
  
  const hasNutrients = summary.nutrients.n > 0 || summary.nutrients.p > 0 || 
                       summary.nutrients.k > 0 || summary.nutrients.s > 0;

  // Aggregate functions for this pass and count products missing roles
  const { passFunctions, missingRolesCount } = React.useMemo(() => {
    const functionSet = new Set<string>();
    let missingCount = 0;
    
    summary.applications.forEach(app => {
      const product = products.find(p => p.id === app.productId);
      if (!product) return;
      
      // Get roles from purpose
      const purpose = purposes[product.id];
      const roles = purpose?.roles || [];
      
      // Check if product is missing roles
      if (!roles.length || !purpose?.rolesConfirmed) {
        missingCount++;
      }
      
      // Also check legacy role string
      if (app.role) {
        const roleStr = app.role.toLowerCase();
        if (roleStr.includes('root')) roles.push('rooting-vigor');
        if (roleStr.includes('carbon') || roleStr.includes('biology')) roles.push('carbon-biology-food');
        if (roleStr.includes('stress')) roles.push('stress-mitigation');
        if (roleStr.includes('nitrogen') || roleStr.includes('n eff')) roles.push('nitrogen-conversion');
        if (roleStr.includes('fertil') || roleStr.includes('macro')) roles.push('fertility-macro');
      }
      
      roles.forEach(role => {
        const cat = getRoleFunctionCategory(role);
        if (cat) functionSet.add(cat.label);
      });
    });
    
    return {
      passFunctions: Array.from(functionSet),
      missingRolesCount: missingCount,
    };
  }, [summary.applications, products, purposes]);

  // Count fields with overrides for applications in this pass
  const fieldOverrideCount = React.useMemo(() => {
    const passAppIds = new Set(summary.applications.map(a => a.id));
    const fieldsWithOverrides = new Set(
      fieldOverrides
        .filter(o => passAppIds.has(o.applicationId))
        .map(o => o.fieldAssignmentId)
    );
    return fieldsWithOverrides.size;
  }, [summary.applications, fieldOverrides]);

  // Calculate inventory shortages for products in this pass
  const inventoryShortageCount = useMemo(() => {
    if (!inventory || inventory.length === 0) return 0;
    
    // Build inventory lookup (aggregate all rows per product)
    const invByProduct = new Map<string, number>();
    inventory.forEach(item => {
      const current = invByProduct.get(item.productId) || 0;
      invByProduct.set(item.productId, current + (item.quantity || 0));
    });
    
    // Count products in this pass that have 0 inventory
    let shortCount = 0;
    const seenProducts = new Set<string>();
    
    summary.applications.forEach(app => {
      if (seenProducts.has(app.productId)) return;
      seenProducts.add(app.productId);
      
      const onHand = invByProduct.get(app.productId) || 0;
      if (onHand <= 0) {
        shortCount++;
      }
    });
    
    return shortCount;
  }, [summary.applications, inventory]);

  // Calculate pass type from product categories
  const passType = useMemo(() => 
    getPassType(summary.applications, productMasters),
    [summary.applications, productMasters]
  );
  const passTypeConfig = PASS_TYPE_CONFIG[passType];
  const PassTypeIcon = passTypeConfig.Icon;

  const patternStyle = PATTERN_BADGE_STYLES[summary.passPattern];

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-all">
      {/* Card Header - Always visible, scannable summary */}
      <div
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab" />
          
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
          
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {isEditingName ? (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') { setIsEditingName(false); setNameValue(timing.name); }
                    }}
                    className="px-2 py-1 border border-input rounded text-sm font-semibold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 text-primary hover:bg-primary/10 rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setIsEditingName(false); setNameValue(timing.name); }}
                    className="p-1 text-muted-foreground hover:bg-muted rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
              <div className="flex items-center gap-1 group/name">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-foreground uppercase tracking-wide">
                        {timing.name}
                      </h3>
                      {onUpdateTiming && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setIsEditingName(true); }}
                          className="p-1 opacity-0 group-hover/name:opacity-100 text-muted-foreground hover:text-foreground rounded transition-opacity"
                          title="Rename timing"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {/* Timing line - always visible */}
                    <div className="flex items-center gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-muted-foreground">
                        {getTimingDisplayText(
                          timing.timingBucket || 'IN_SEASON',
                          timing.growthStageStart,
                          timing.growthStageEnd
                        )}
                      </span>
                      {onUpdateTiming && (
                        <TimingEditorPopover
                          timing={timing}
                          cropType={crop.cropType}
                          cropName={crop.name}
                          onUpdate={onUpdateTiming}
                        >
                          <button
                            className="p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                            title="Edit timing"
                          >
                            <Clock className="w-3 h-3" />
                          </button>
                        </TimingEditorPopover>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Pass Type Badge */}
              {passType !== 'other' && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    passTypeConfig.bgColor,
                    passTypeConfig.textColor
                  )}
                >
                  <PassTypeIcon className="w-3 h-3" />
                  {passTypeConfig.label}
                </span>
              )}
              {/* Pass Pattern Badge */}
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  patternStyle.bg,
                  patternStyle.text
                )}
              >
                {patternStyle.label}
              </span>
              
              {/* Function chips */}
              {passFunctions.length > 0 && (
                <div className="flex items-center gap-1">
                  {passFunctions.slice(0, 3).map(func => {
                    const style = FUNCTION_CHIP_STYLES[func] || { bg: 'bg-muted', text: 'text-muted-foreground' };
                    return (
                      <span
                        key={func}
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          style.bg,
                          style.text
                        )}
                      >
                        {func}
                      </span>
                    );
                  })}
                  {passFunctions.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{passFunctions.length - 3}
                    </span>
                  )}
                </div>
              )}
              
              {/* Missing roles indicator */}
              {missingRolesCount > 0 && (
                <span 
                  className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-xs"
                  title={`${missingRolesCount} product${missingRolesCount !== 1 ? 's' : ''} need roles`}
                >
                  <AlertCircle className="w-3 h-3" />
                  {missingRolesCount}
                </span>
              )}
              
              {/* Field-specific overrides indicator */}
              {fieldOverrideCount > 0 && (
                <span 
                  className="flex items-center gap-1 px-2 py-0.5 bg-violet-500/10 text-violet-600 rounded-full text-xs"
                  title={`${fieldOverrideCount} field${fieldOverrideCount !== 1 ? 's' : ''} have specific overrides`}
                >
                  <Zap className="w-3 h-3" />
                  {fieldOverrideCount} field{fieldOverrideCount !== 1 ? 's' : ''}
                </span>
              )}
              
              {/* Inventory shortage indicator */}
              {inventoryShortageCount > 0 && (
                <span 
                  className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-full text-xs"
                  title={`${inventoryShortageCount} product${inventoryShortageCount !== 1 ? 's' : ''} have no inventory on hand`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {inventoryShortageCount} short
                </span>
              )}
            </div>
            
            {/* Coverage distribution + nutrients + physical quantity */}
            <div className="flex items-center gap-2 mt-0.5">
              <CoverageDistribution 
                coverageGroups={summary.coverageGroups} 
                totalProducts={summary.applications.length}
                totalAcres={crop.totalAcres}
              />
              {hasNutrients && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-muted-foreground">
                    • N {formatNumber(summary.nutrients.n, 1)} | P {formatNumber(summary.nutrients.p, 1)} | K {formatNumber(summary.nutrients.k, 1)} | S {formatNumber(summary.nutrients.s, 1)}
                  </span>
                  {(summary.nutrients.s > 0 || summary.nutrients.k > 0) && (
                    <span className="text-xs text-muted-foreground ml-2">
                      <span className="text-muted-foreground/60">Ratios</span>{' '}
                      {summary.nutrients.s > 0 && (
                        <span>N:S {formatNumber(summary.nutrients.n / summary.nutrients.s, 1)}:1</span>
                      )}
                      {summary.nutrients.s > 0 && summary.nutrients.k > 0 && ' · '}
                      {summary.nutrients.k > 0 && (
                        <span>N:K {formatNumber(summary.nutrients.n / summary.nutrients.k, 1)}:1</span>
                      )}
                    </span>
                  )}
                  {/* Physical quantity badges - separate visual block */}
                  {(summary.physicalQuantity.totalDryLbs > 0 || summary.physicalQuantity.totalLiquidGal > 0) && (
                    <div className="flex items-center gap-2 mt-1 ml-2">
                      {summary.physicalQuantity.totalDryLbs > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-medium">
                          <span className="font-semibold">{formatNumber(summary.physicalQuantity.totalDryLbs, 0)}</span>
                          <span className="text-stone-500">lbs</span>
                        </span>
                      )}
                      {summary.physicalQuantity.totalLiquidGal > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 text-xs font-medium">
                          <span className="font-semibold">{formatNumber(summary.physicalQuantity.totalLiquidGal, 1)}</span>
                          <span className="text-sky-500">gal</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Physical quantity badges when no nutrients */}
              {!hasNutrients && (summary.physicalQuantity.totalDryLbs > 0 || summary.physicalQuantity.totalLiquidGal > 0) && (
                <div className="flex items-center gap-2">
                  {summary.physicalQuantity.totalDryLbs > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-medium">
                      <span className="font-semibold">{formatNumber(summary.physicalQuantity.totalDryLbs, 0)}</span>
                      <span className="text-stone-500">lbs</span>
                    </span>
                  )}
                  {summary.physicalQuantity.totalLiquidGal > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 text-xs font-medium">
                      <span className="font-semibold">{formatNumber(summary.physicalQuantity.totalLiquidGal, 1)}</span>
                      <span className="text-sky-500">gal</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Awarded bid indicator at pass level */}
          {awardedProductsCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-medium">
              <Award className="w-3.5 h-3.5" />
              {awardedProductsCount} bid{awardedProductsCount !== 1 ? 's' : ''}
            </span>
          )}
          
          {/* Cost display - ALWAYS show field avg at pass level (budget truth) */}
          <div className="text-right">
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(summary.costPerFieldAcre)}/ac
              {/* Only show "field" label when not uniform (treated ≠ field) */}
              {summary.passPattern !== 'uniform' && (
                <span className="text-sm font-normal text-muted-foreground ml-1">field</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(summary.totalCost)} total
            </p>
          </div>
          
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onDuplicateTiming(timing.id)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Duplicate timing"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteTiming(timing.id)}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              title="Delete timing"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content - Products grouped by acreage tier */}
      {isExpanded && (
        <div className="px-6 pb-4 space-y-4 animate-accordion-down">
          {summary.applications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No products in this timing yet
            </p>
          ) : (
            summary.coverageGroups.map(group => {
              const hasGroupNutrients = group.nutrients.n > 0.1 || group.nutrients.p > 0.1 || 
                                        group.nutrients.k > 0.1 || group.nutrients.s > 0.1;
              return (
              <div key={group.acresPercentage} className="space-y-2">
                {/* Group Header - always show for acres visibility */}
                {(
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-semibold',
                          group.tierLabel === 'Core' ? 'bg-emerald-500/15 text-emerald-600' :
                          group.tierLabel === 'Selective' ? 'bg-amber-500/15 text-amber-600' :
                          'bg-violet-500/15 text-violet-600'
                        )}>
                          {group.tierLabel}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(group.acresPercentage, 0)}% · {formatNumber(group.acresTreated, 0)} ac
                        </span>
                      </div>
                      {/* Tier-level nutrient analysis */}
                      {hasGroupNutrients && (
                        <div className="flex items-center gap-1.5 text-xs ml-1">
                          {group.nutrients.n > 0.1 && (
                            <span className="text-emerald-600">N {formatNumber(group.nutrients.n, 1)}</span>
                          )}
                          {group.nutrients.p > 0.1 && (
                            <span className="text-blue-600">P {formatNumber(group.nutrients.p, 1)}</span>
                          )}
                          {group.nutrients.k > 0.1 && (
                            <span className="text-amber-600">K {formatNumber(group.nutrients.k, 1)}</span>
                          )}
                          {group.nutrients.s > 0.1 && (
                            <span className="text-purple-600">S {formatNumber(group.nutrients.s, 1)}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-primary font-semibold">
                        {formatCurrency(group.costPerTreatedAcre)}/ac
                        <span className="font-normal text-muted-foreground ml-1">treated</span>
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(group.costPerFieldAcre)}/ac field
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Products in this group */}
                <div className="space-y-2">
                  {group.applications.map(app => {
                    const product = products.find(p => p.id === app.productId);
                    const vendor = product ? vendors.find(v => v.id === product.vendorId) : null;
                    const acresPercentage = getApplicationAcresPercentage(app, crop);
                    const purpose = product ? purposes[product.id] : null;
                    const override = applicationOverrides[app.id];
                    
                    return (
                      <ProductRowReadable
                        key={app.id}
                        application={app}
                        product={product}
                        vendor={vendor}
                        totalAcres={crop.totalAcres}
                        acresPercentage={acresPercentage}
                        purpose={purpose}
                        override={override}
                        productMasters={productMasters}
                        priceBook={priceBook}
                        seasonYear={seasonYear}
                        onEdit={() => onEditApplication(app)}
                        onUpdateOverride={onUpdateApplicationOverride}
                      />
                    );
                  })}
                </div>
              </div>
            );})
          )}
          
          <button
            onClick={() => onAddApplication(timing.id)}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 text-sm text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      )}
    </div>
  );
};
