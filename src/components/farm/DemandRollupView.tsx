import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Package, Droplets, Weight, FileSpreadsheet } from 'lucide-react';
import type { Season, ProductMaster, CommoditySpec } from '@/types';
import { calculateDemandRollup, formatDemandQty, generateBidSheetCSV } from '@/lib/procurementCalculations';
import { downloadCSV } from '@/lib/calculations';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DemandRollupViewProps {
  season: Season | null;
  productMasters: ProductMaster[];
  commoditySpecs: CommoditySpec[];
}

export const DemandRollupView: React.FC<DemandRollupViewProps> = ({
  season,
  productMasters,
  commoditySpecs,
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const demandRollup = useMemo(() => 
    calculateDemandRollup(season, productMasters, commoditySpecs),
    [season, productMasters, commoditySpecs]
  );
  
  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const handleExportCSV = () => {
    if (!season) return;
    const csv = generateBidSheetCSV(demandRollup, season.year);
    downloadCSV(csv, `${season.year}-demand-rollup.csv`);
  };
  
  const bidEligibleProducts = productMasters.filter(p => p.isBidEligible);
  
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">Demand Rollup</h2>
          <p className="text-stone-500 mt-1">
            Aggregated quantities from {season?.year || 'current'} crop plans
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={demandRollup.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export Bid Sheet
          </button>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">{demandRollup.length}</p>
              <p className="text-sm text-stone-500">Commodities</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Weight className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">
                {demandRollup.filter(r => r.uom === 'ton' || r.uom === 'lbs').reduce((sum, r) => {
                  return sum + (r.uom === 'ton' ? r.plannedQty : r.plannedQty / 2000);
                }, 0).toFixed(1)}
              </p>
              <p className="text-sm text-stone-500">Total Tons (Dry)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Droplets className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">
                {demandRollup.filter(r => r.uom === 'gal').reduce((sum, r) => sum + r.plannedQty, 0).toFixed(0)}
              </p>
              <p className="text-sm text-stone-500">Total Gallons (Liquid)</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Empty State */}
      {demandRollup.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-stone-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">No Demand to Roll Up</h3>
          <p className="text-stone-500 max-w-md mx-auto mb-4">
            {bidEligibleProducts.length === 0 
              ? "No products are marked as bid-eligible. Go to Products and mark commodities as bid-eligible to see them here."
              : "No bid-eligible products are used in this season's crop plans yet."}
          </p>
          <p className="text-sm text-stone-400">
            Bid-eligible products: {bidEligibleProducts.length}
          </p>
        </div>
      )}
      
      {/* Demand List */}
      {demandRollup.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-200 bg-stone-50">
            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              <div className="col-span-6">Commodity / Spec</div>
              <div className="col-span-2 text-right">Total Qty</div>
              <div className="col-span-1">UOM</div>
              <div className="col-span-3">Crops</div>
            </div>
          </div>
          
          <div className="divide-y divide-stone-100">
            {demandRollup.map(item => {
              const isExpanded = expandedItems.has(item.specId || item.productId);
              const product = productMasters.find(p => p.id === item.productId);
              
              return (
                <Collapsible key={item.specId || item.productId} open={isExpanded}>
                  <CollapsibleTrigger asChild>
                    <button
                      onClick={() => toggleExpanded(item.specId || item.productId)}
                      className="w-full px-6 py-4 hover:bg-stone-50 transition-colors"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-6 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            product?.form === 'liquid' ? 'bg-cyan-100' : 'bg-amber-100'
                          }`}>
                            {product?.form === 'liquid' 
                              ? <Droplets className="w-5 h-5 text-cyan-600" />
                              : <Weight className="w-5 h-5 text-amber-600" />}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-stone-800">{item.specName}</p>
                            {item.specId && (
                              <p className="text-xs text-stone-400">from {item.productName}</p>
                            )}
                          </div>
                          {isExpanded 
                            ? <ChevronDown className="w-4 h-4 text-stone-400" />
                            : <ChevronRight className="w-4 h-4 text-stone-400" />}
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-lg font-bold text-stone-800">
                            {formatDemandQty(item.plannedQty, item.uom)}
                          </span>
                        </div>
                        <div className="col-span-1">
                          <span className="text-sm text-stone-600">{item.uom}</span>
                        </div>
                        <div className="col-span-3 text-left">
                          <span className="text-sm text-stone-500">
                            {item.cropBreakdown.map(c => c.cropName).join(', ')}
                          </span>
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-6 pb-4 bg-stone-50">
                      <div className="ml-13 pl-6 border-l-2 border-stone-200 space-y-2">
                        {item.cropBreakdown.map(breakdown => (
                          <div key={breakdown.cropName} className="flex items-center justify-between py-2">
                            <span className="text-sm text-stone-600">{breakdown.cropName}</span>
                            <span className="text-sm font-medium text-stone-700">
                              {formatDemandQty(breakdown.qty, item.uom)} {item.uom}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
