import React, { useMemo } from 'react';
import { ArrowUp, ArrowDown, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Season, Product, InventoryItem } from '@/types/farm';
import type { Order } from '@/types/orderInvoice';
import { formatCurrency, formatNumber, calculateCropCosts, calculateCropNutrientSummary } from '@/lib/calculations';
import { NutrientSummaryCompact } from '@/components/NutrientSummary';
import { calculateReadinessSummary } from '@/lib/planReadinessUtils';

interface DashboardViewProps {
  season: Season | null;
  products: Product[];
  inventory?: InventoryItem[];
  orders?: Order[];
  onViewChange?: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  season, 
  products,
  inventory = [],
  orders = [],
  onViewChange,
}) => {
  const stats = useMemo(() => {
    if (!season) return { totalAcres: 0, totalCost: 0, costPerAcre: 0, cropCount: 0 };
    
    let totalCost = 0;
    let totalAcres = 0;
    
    season.crops.forEach(crop => {
      totalAcres += crop.totalAcres;
      const costs = calculateCropCosts(crop, products);
      totalCost += costs.totalCost;
    });
    
    return {
      totalAcres,
      totalCost,
      costPerAcre: totalAcres > 0 ? totalCost / totalAcres : 0,
      cropCount: season.crops.length,
    };
  }, [season, products]);

  const cropSummaries = useMemo(() => {
    if (!season) return [];
    
    return season.crops.map(crop => {
      const costs = calculateCropCosts(crop, products);
      const nutrients = calculateCropNutrientSummary(crop, products);
      
      return {
        name: crop.name,
        acres: crop.totalAcres,
        totalCost: costs.totalCost,
        costPerAcre: costs.costPerAcre,
        applicationCount: crop.applicationTimings.length,
        nutrients,
      };
    });
  }, [season, products]);

  // Get comparative indicator for crop cost/acre vs farm average
  const getComparativeIndicator = (cropCostPerAcre: number) => {
    if (stats.costPerAcre === 0) return null;
    const deviation = (cropCostPerAcre - stats.costPerAcre) / stats.costPerAcre;
    
    if (deviation > 0.10) {
      return <ArrowUp className="w-4 h-4 text-amber-500" />;
    } else if (deviation < -0.10) {
      return <ArrowDown className="w-4 h-4 text-emerald-500" />;
    }
    return null;
  };

  // Calculate plan readiness - NOW WITH ORDERS!
  const readiness = useMemo(() => 
    calculateReadinessSummary(season, products, inventory, orders),
    [season, products, inventory, orders]
  );

  return (
    <div className="p-8">
      {/* Hero Section - Total Plan Cost */}
      <div className="bg-card rounded-xl p-8 shadow-sm border border-border mb-8">
        <div className="text-center">
          <p className="text-4xl font-bold text-primary mb-1">
            {formatCurrency(stats.totalCost)}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Total Plan Cost ({season?.year || new Date().getFullYear()})
          </p>
          <p className="text-sm text-muted-foreground">
            {formatNumber(stats.totalAcres, 0)} acres&nbsp;&nbsp;•&nbsp;&nbsp;
            {formatCurrency(stats.costPerAcre)}/ac avg&nbsp;&nbsp;•&nbsp;&nbsp;
            {stats.cropCount} crop{stats.cropCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Plan Readiness Widget */}
      {readiness.totalProducts > 0 && (
        <div 
          onClick={() => onViewChange?.('plan-readiness')}
          className={`bg-card rounded-xl p-6 shadow-sm border border-border mb-8 cursor-pointer hover:border-primary/50 transition-colors ${
            onViewChange ? '' : 'cursor-default'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Plan Readiness</h3>
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
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{readiness.readyCount} Ready</span>
            <span>•</span>
            <span>{readiness.onOrderCount} On Order</span>
            <span>•</span>
            <span>{readiness.blockingCount} Blocking</span>
          </div>
          
          {/* Blocking Warning */}
          {readiness.blockingCount > 0 && (
            <p className="text-sm text-red-600 mt-2 font-medium">
              {readiness.blockingCount} item{readiness.blockingCount !== 1 ? 's' : ''} blocking plan execution
            </p>
          )}
        </div>
      )}

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
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Cost</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acres</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cropSummaries.map((crop, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <td className="px-6 py-4 font-medium text-foreground">{crop.name}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-lg font-bold text-primary">{formatCurrency(crop.costPerAcre)}</span>
                      {getComparativeIndicator(crop.costPerAcre)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(crop.totalCost)}</td>
                  <td className="px-6 py-4 text-right text-muted-foreground">{formatNumber(crop.acres, 0)}</td>
                  <td className="px-6 py-4 text-right text-muted-foreground">{crop.applicationCount}</td>
                </tr>
              ))}
              {cropSummaries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
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
