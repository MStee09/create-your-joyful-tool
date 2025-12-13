import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Copy, Trash2, GripVertical } from 'lucide-react';
import type { ApplicationTiming, Application, Crop, Product } from '@/types/farm';
import type { ProductPurpose } from '@/types/productIntelligence';
import { formatCurrency, formatNumber } from '@/utils/farmUtils';
import { ProductRowReadable } from './ProductRowReadable';
import { calculatePassSummary, getApplicationAcresPercentage } from '@/lib/cropCalculations';
import { FUNCTION_CATEGORIES, getRoleFunctionCategory } from '@/lib/functionCategories';

interface PassCardProps {
  timing: ApplicationTiming;
  crop: Crop;
  products: Product[];
  purposes?: Record<string, ProductPurpose>;
  onEditApplication: (app: Application) => void;
  onAddApplication: (timingId: string) => void;
  onDuplicateTiming: (timingId: string) => void;
  onDeleteTiming: (timingId: string) => void;
  defaultExpanded?: boolean;
}

export const PassCard: React.FC<PassCardProps> = ({
  timing,
  crop,
  products,
  purposes = {},
  onEditApplication,
  onAddApplication,
  onDuplicateTiming,
  onDeleteTiming,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const summary = calculatePassSummary(timing, crop, products);
  const costPerAcre = crop.totalAcres > 0 ? summary.totalCost / crop.totalAcres : 0;
  
  const hasNutrients = summary.nutrients.n > 0 || summary.nutrients.p > 0 || 
                       summary.nutrients.k > 0 || summary.nutrients.s > 0;

  // Aggregate functions for this pass
  const passFunctions = React.useMemo(() => {
    const functionSet = new Set<string>();
    
    summary.applications.forEach(app => {
      const product = products.find(p => p.id === app.productId);
      if (!product) return;
      
      // Get roles from purpose
      const purpose = purposes[product.id];
      const roles = purpose?.roles || [];
      
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
    
    return Array.from(functionSet);
  }, [summary.applications, products, purposes]);

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
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-foreground uppercase tracking-wide">
                {timing.name}
              </h3>
              {passFunctions.length > 0 && (
                <span className="text-sm text-primary/80 font-medium">
                  {passFunctions.join(' • ')}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Avg acres: {formatNumber(summary.avgAcresPercentage, 0)}% • {summary.applications.length} product{summary.applications.length !== 1 ? 's' : ''}
              {hasNutrients && (
                <span className="ml-2">
                  • N {formatNumber(summary.nutrients.n, 1)} | P {formatNumber(summary.nutrients.p, 1)} | K {formatNumber(summary.nutrients.k, 1)} | S {formatNumber(summary.nutrients.s, 1)}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-lg font-semibold text-primary">{formatCurrency(costPerAcre)}/ac</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(summary.totalCost)} total</p>
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

      {/* Expanded Content - Readable product rows */}
      {isExpanded && (
        <div className="px-6 pb-4 space-y-2 animate-accordion-down">
          {summary.applications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No products in this timing yet
            </p>
          ) : (
            summary.applications.map(app => {
              const product = products.find(p => p.id === app.productId);
              const acresPercentage = getApplicationAcresPercentage(app, crop);
              
              return (
                <ProductRowReadable
                  key={app.id}
                  application={app}
                  product={product}
                  totalAcres={crop.totalAcres}
                  acresPercentage={acresPercentage}
                  onEdit={() => onEditApplication(app)}
                />
              );
            })
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
