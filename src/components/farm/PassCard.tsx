import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Copy, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import type { ApplicationTiming, Application, Crop, Product, Vendor } from '@/types/farm';
import type { ProductPurpose, ApplicationOverride } from '@/types/productIntelligence';
import { formatCurrency, formatNumber } from '@/utils/farmUtils';
import { ProductRowReadable } from './ProductRowReadable';
import { calculatePassSummary, getApplicationAcresPercentage, type CoverageGroup, type PassPattern } from '@/lib/cropCalculations';
import { FUNCTION_CATEGORIES, getRoleFunctionCategory } from '@/lib/functionCategories';
import { cn } from '@/lib/utils';

interface PassCardProps {
  timing: ApplicationTiming;
  crop: Crop;
  products: Product[];
  vendors?: Vendor[];
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

// Pass pattern badge styles
const PATTERN_BADGE_STYLES: Record<PassPattern, { bg: string; text: string; label: string }> = {
  'uniform': { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Uniform' },
  'selective': { bg: 'bg-amber-500/15', text: 'text-amber-600', label: 'Selective' },
  'trial': { bg: 'bg-violet-500/15', text: 'text-violet-600', label: 'Trial' },
};

// Coverage distribution display
const CoverageDistribution: React.FC<{ 
  coverageGroups: CoverageGroup[]; 
  totalProducts: number;
}> = ({ coverageGroups, totalProducts }) => {
  if (coverageGroups.length === 0) return null;
  
  if (coverageGroups.length === 1) {
    const group = coverageGroups[0];
    return (
      <span className="text-sm text-muted-foreground">
        {formatNumber(group.acresPercentage, 0)}% → {group.applications.length} product{group.applications.length !== 1 ? 's' : ''}
      </span>
    );
  }
  
  // Multiple tiers - compact display
  return (
    <span className="text-sm text-muted-foreground">
      {coverageGroups.map((g, i) => (
        <span key={g.acresPercentage}>
          {i > 0 && ' · '}
          <span className="text-foreground/80">{formatNumber(g.acresPercentage, 0)}%</span>
          <span className="text-muted-foreground/70"> ({g.applications.length})</span>
        </span>
      ))}
    </span>
  );
};

export const PassCard: React.FC<PassCardProps> = ({
  timing,
  crop,
  products,
  vendors = [],
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
              <h3 className="font-semibold text-foreground uppercase tracking-wide">
                {timing.name}
              </h3>
              
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
            </div>
            
            {/* Coverage distribution + nutrients */}
            <div className="flex items-center gap-2 mt-0.5">
              <CoverageDistribution 
                coverageGroups={summary.coverageGroups} 
                totalProducts={summary.applications.length}
              />
              {hasNutrients && (
                <span className="text-sm text-muted-foreground">
                  • N {formatNumber(summary.nutrients.n, 1)} | P {formatNumber(summary.nutrients.p, 1)} | K {formatNumber(summary.nutrients.k, 1)} | S {formatNumber(summary.nutrients.s, 1)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Cost display - field average as primary for Selective, treated for Uniform */}
          <div className="text-right">
            {summary.passPattern === 'selective' ? (
              <>
                {/* Selective: show field avg as primary, no treated at pass level */}
                <p className="text-lg font-semibold text-primary">
                  {formatCurrency(summary.costPerFieldAcre)}/ac
                  <span className="text-sm font-normal text-muted-foreground ml-1">field</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(summary.totalCost)} total
                </p>
              </>
            ) : (
              <>
                {/* Uniform/Trial: treated = field for 100% passes */}
                <p className="text-lg font-semibold text-primary">
                  {formatCurrency(summary.costPerTreatedAcre)}/ac
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(summary.totalCost)} total
                </p>
              </>
            )}
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
            summary.coverageGroups.map(group => (
              <div key={group.acresPercentage} className="space-y-2">
                {/* Group Header - only show if multiple groups */}
                {summary.coverageGroups.length > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg">
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
                        onEdit={() => onEditApplication(app)}
                        onUpdateOverride={onUpdateApplicationOverride}
                      />
                    );
                  })}
                </div>
              </div>
            ))
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
