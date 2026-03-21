import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { Season, Product, InventoryItem } from '@/types/farm';
import type { SimplePurchase } from '@/types/simplePurchase';
import type { ProductMaster, PriceBookEntry } from '@/types';
import type { CostSnapshot } from '@/hooks/useCostSnapshots';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { NutrientSummaryCompact } from '@/components/NutrientSummary';
import { calculateReadinessSummary } from '@/lib/planReadinessUtils';
import { calculateSeasonSummaryWithPriceBook, PriceBookContext } from '@/lib/cropCalculations';
import { QuickActionsCard } from './applications/QuickActionsCard';
import { CostTrendSparkline } from './CostTrendSparkline';

interface DashboardViewProps {
  season: Season | null;
  products: Product[];
  productMasters?: ProductMaster[];
  priceBook?: PriceBookEntry[];
  seasonYear?: number;
  inventory?: InventoryItem[];
  purchases?: SimplePurchase[];
  costSnapshots?: CostSnapshot[];
  onViewChange?: (view: string) => void;
  onOpenRecordApplication?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  season, 
  products,
  productMasters = [],
  priceBook = [],
  seasonYear = new Date().getFullYear(),
  inventory = [],
  purchases = [],
  costSnapshots = [],
  onViewChange,
  onOpenRecordApplication,
}) => {
  // Build price book context for consistent cost calculations
  const priceBookContext: PriceBookContext = useMemo(() => ({
    productMasters,
    priceBook,
    seasonYear,
    purchases,
  }), [productMasters, priceBook, seasonYear, purchases]);

  const stats = useMemo(() => {
    if (!season) return { totalAcres: 0, totalCost: 0, costPerAcre: 0, cropCount: 0 };
    
    let totalCost = 0;
    let totalAcres = 0;
    
    season.crops.forEach(crop => {
      totalAcres += crop.totalAcres;
      // Use price book-aware calculation for consistency with CropPlanningView
      const summary = calculateSeasonSummaryWithPriceBook(crop, products, priceBookContext);
      totalCost += summary.totalCost;
    });
    
    return {
      totalAcres,
      totalCost,
      costPerAcre: totalAcres > 0 ? totalCost / totalAcres : 0,
      cropCount: season.crops.length,
    };
  }, [season, products, priceBookContext]);

  const cropSummaries = useMemo(() => {
    if (!season) return [];
    
    return season.crops.map(crop => {
      // Use price book-aware calculation for consistency with CropPlanningView
      const summary = calculateSeasonSummaryWithPriceBook(crop, products, priceBookContext);
      
      return {
        name: crop.name,
        acres: crop.totalAcres,
        totalCost: summary.totalCost,
        costPerAcre: summary.costPerAcre,
        applicationCount: crop.applicationTimings.length,
        // Use nutrients from the same calculation for consistency
        nutrients: summary.nutrients,
      };
    });
  }, [season, products, priceBookContext]);

  // Get sparkline + trend indicator for crop
  const getCropTrend = (cropId: string, cropCostPerAcre: number) => {
    const cropSnaps = costSnapshots.filter(s => s.cropId === cropId);
    return (
      <CostTrendSparkline
        snapshots={cropSnaps}
        currentCostPerAcre={cropCostPerAcre}
      />
    );
  };

  // Calculate plan readiness using SimplePurchases
  const readiness = useMemo(() => 
    calculateReadinessSummary(season, products, inventory, purchases),
    [season, products, inventory, purchases]
  );

  return (
    <div className="p-8">
      {/* Quick Actions */}
      <QuickActionsCard
        onRecordApplication={() => onOpenRecordApplication?.()}
        onMixCalculator={() => onViewChange?.('mix-calculator')}
        onNewPurchase={() => onViewChange?.('purchases')}
      />

      {/* Plan Readiness Widget */}
      {readiness.totalProducts > 0 && (
        <div 
          onClick={() => onViewChange?.('procurement')}
          className={`bg-card rounded-xl p-6 shadow-sm border border-border mb-8 cursor-pointer hover:border-primary/50 transition-colors ${
            onViewChange ? '' : 'cursor-default'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Inputs Needed</h3>
            {readiness.blockingCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="h-3 bg-muted rounded-full overflow-hidden flex mb-3">
            <div 
              className="h-full bg-emerald-500 transition-all" 
              style={{ width: `${readiness.readyPct}%` }} 
            />
            <div 
              className="h-full bg-blue-500 transition-all" 
              style={{ width: `${readiness.onOrderPct}%` }} 
            />
            <div 
              className="h-full bg-red-500 transition-all" 
              style={{ width: `${readiness.blockingPct}%` }} 
            />
          </div>
          
          {/* Coverage and Value Metrics */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Coverage by Value</span>
              <span className="font-semibold text-foreground">{Math.round(readiness.coveragePct)}%</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-emerald-600 font-medium">{formatCurrency(readiness.onHandValue)} On Hand</span>
              <span>·</span>
              <span className="text-blue-600 font-medium">{formatCurrency(readiness.onOrderValue)} Ordered</span>
              {readiness.shortValue > 0 && (
                <>
                  <span>·</span>
                  <span className="text-red-600 font-medium">{formatCurrency(readiness.shortValue)} to Go</span>
                </>
              )}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{readiness.readyCount} Ready</span>
            <span>•</span>
            <span>{readiness.onOrderCount} Ordered</span>
            <span>•</span>
            <span>{readiness.blockingCount} Need to Order</span>
          </div>
          
          {/* Need to Order Warning */}
          {readiness.blockingCount > 0 && (
            <p className="text-sm text-red-600 mt-2 font-medium">
              {readiness.blockingCount} product{readiness.blockingCount !== 1 ? 's' : ''} still need to be ordered
            </p>
          )}
        </div>
      )}

      {/* Season Cost Summary — compact horizontal bar */}
      <div className="bg-card rounded-xl shadow-sm border border-border mb-8 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Plan Cost</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(stats.totalCost)}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">$/Acre Avg</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(stats.costPerAcre)}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Acres</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(stats.totalAcres, 0)}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Crops</p>
              <p className="text-xl font-bold text-foreground">{stats.cropCount}</p>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">{season?.year || new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Crop Summary Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border mb-8">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Crop Cost Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Crop</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cost/Acre</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trend</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Cost</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acres</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cropSummaries.map((crop, idx) => (
                <tr 
                  key={idx} 
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => {
                    // Navigate to crop plans and select this crop
                    onViewChange?.('crops');
                  }}
                >
                  <td className="px-6 py-4 font-medium text-foreground">{crop.name}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-bold text-primary">{formatCurrency(crop.costPerAcre)}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getCropTrend(season!.crops[idx]?.id || '', crop.costPerAcre)}
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(crop.totalCost)}</td>
                  <td className="px-6 py-4 text-right text-muted-foreground">{formatNumber(crop.acres, 0)}</td>
                  <td className="px-6 py-4 text-right text-muted-foreground">{crop.applicationCount}</td>
                </tr>
              ))}
              {cropSummaries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No crops configured. Add crops in the Crop Plans section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nutrient Summary Cards */}
      {cropSummaries.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-4">Nutrient Summary (lbs/acre)</h3>
          <div className="grid grid-cols-3 gap-4">
            {cropSummaries.map((crop, idx) => (
              <NutrientSummaryCompact
                key={idx}
                nutrientSummary={crop.nutrients}
                cropName={crop.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
