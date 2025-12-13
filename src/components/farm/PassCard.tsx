import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Copy, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import type { ApplicationTiming, Application, Crop, Product } from '@/types/farm';
import type { ProductPurpose, ApplicationOverride } from '@/types/productIntelligence';
import { formatCurrency, formatNumber } from '@/utils/farmUtils';
import { ProductRowReadable } from './ProductRowReadable';
import { calculatePassSummary, getApplicationAcresPercentage } from '@/lib/cropCalculations';
import { FUNCTION_CATEGORIES, getRoleFunctionCategory } from '@/lib/functionCategories';
import { cn } from '@/lib/utils';

interface PassCardProps {
  timing: ApplicationTiming;
  crop: Crop;
  products: Product[];
  purposes?: Record<string, ProductPurpose>;
  applicationOverrides?: Record<string, ApplicationOverride>;
  onEditApplication: (app: Application) => void;
  onAddApplication: (timingId: string) => void;
  onDuplicateTiming: (timingId: string) => void;
  onDeleteTiming: (timingId: string) => void;
  onUpdateApplicationOverride?: (override: ApplicationOverride) => void;
  defaultExpanded?: boolean;
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

export const PassCard: React.FC<PassCardProps> = ({
  timing,
  crop,
  products,
  purposes = {},
  applicationOverrides = {},
  onEditApplication,
  onAddApplication,
  onDuplicateTiming,
  onDeleteTiming,
  onUpdateApplicationOverride,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const summary = calculatePassSummary(timing, crop, products);
  const costPerAcre = crop.totalAcres > 0 ? summary.totalCost / crop.totalAcres : 0;
  
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
              <h3 className="font-semibold text-foreground uppercase tracking-wide">
                {timing.name}
              </h3>
              
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
              const purpose = product ? purposes[product.id] : null;
              const override = applicationOverrides[app.id];
              
              return (
                <ProductRowReadable
                  key={app.id}
                  application={app}
                  product={product}
                  totalAcres={crop.totalAcres}
                  acresPercentage={acresPercentage}
                  purpose={purpose}
                  override={override}
                  onEdit={() => onEditApplication(app)}
                  onUpdateOverride={onUpdateApplicationOverride}
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

