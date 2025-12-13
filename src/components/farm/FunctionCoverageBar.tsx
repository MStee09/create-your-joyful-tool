import React from 'react';
import type { Crop, Product } from '@/types/farm';
import type { ProductPurpose } from '@/types/productIntelligence';
import { FUNCTION_CATEGORIES, getTimingPhase, getRoleFunctionCategory } from '@/lib/functionCategories';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FunctionCoverageBarProps {
  crop: Crop;
  products: Product[];
  purposes: Record<string, ProductPurpose>;
}

interface ProductContribution {
  name: string;
  acres: number;
  timing: string;
}

interface PhaseData {
  percent: number;
  products: ProductContribution[];
}

interface FunctionCoverage {
  early: PhaseData;
  mid: PhaseData;
  late: PhaseData;
}

export const FunctionCoverageBar: React.FC<FunctionCoverageBarProps> = ({
  crop,
  products,
  purposes,
}) => {
  // Build coverage map: functionId -> { early, mid, late } with weighted percentages
  const coverage: Record<string, FunctionCoverage> = {};
  
  FUNCTION_CATEGORIES.forEach(cat => {
    coverage[cat.id] = { 
      early: { percent: 0, products: [] },
      mid: { percent: 0, products: [] },
      late: { percent: 0, products: [] }
    };
  });

  // Iterate through timings and their applications
  crop.applicationTimings.forEach((timing, idx) => {
    const phase = getTimingPhase(idx, crop.applicationTimings.length);
    const apps = crop.applications.filter(a => a.timingId === timing.id);
    
    apps.forEach(app => {
      const product = products.find(p => p.id === app.productId);
      if (!product) return;
      
      const acresPercent = app.acresPercentage ?? 100;
      
      // Get roles from purpose or application.role fallback
      const purpose = purposes[product.id];
      const roles: string[] = purpose?.roles ? [...purpose.roles] : [];
      
      // Also check if app has a role string we can match
      if (app.role) {
        const roleStr = app.role.toLowerCase();
        if (roleStr.includes('root')) roles.push('rooting-vigor');
        if (roleStr.includes('carbon') || roleStr.includes('biology')) roles.push('carbon-biology-food');
        if (roleStr.includes('stress')) roles.push('stress-mitigation');
        if (roleStr.includes('nitrogen') || roleStr.includes('n eff')) roles.push('nitrogen-conversion');
      }
      
      // Deduplicate roles
      const uniqueRoles = [...new Set(roles)];
      
      uniqueRoles.forEach(roleStr => {
        const cat = getRoleFunctionCategory(roleStr as any);
        if (cat && coverage[cat.id]) {
          const phaseData = coverage[cat.id][phase];
          
          // Add contribution (will cap later)
          phaseData.products.push({
            name: product.name,
            acres: acresPercent,
            timing: timing.name
          });
          
          // Sum percentages (cap at 100)
          phaseData.percent = Math.min(100, phaseData.percent + acresPercent);
        }
      });
    });
  });

  const phaseColors = {
    early: 'bg-emerald-500',
    mid: 'bg-amber-500',
    late: 'bg-sky-500'
  };

  const phaseLabels = {
    early: 'Early',
    mid: 'Mid',
    late: 'Late'
  };

  const PhaseBar: React.FC<{ 
    phase: 'early' | 'mid' | 'late'; 
    data: PhaseData;
    functionLabel: string;
  }> = ({ phase, data, functionLabel }) => {
    const hasContribution = data.percent > 0;
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex-1 h-3 bg-muted/30 rounded-sm overflow-hidden cursor-default">
            <div 
              className={`h-full ${phaseColors[phase]} transition-all duration-300`}
              style={{ width: `${data.percent}%` }}
            />
          </div>
        </TooltipTrigger>
        {hasContribution && (
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-sm">
              <p className="font-medium mb-1">
                {functionLabel} — {phaseLabels[phase]} ({Math.round(data.percent)}%)
              </p>
              <p className="text-muted-foreground text-xs mb-1">Driven by:</p>
              <ul className="text-xs space-y-0.5">
                {data.products.map((p, i) => (
                  <li key={i}>• {p.name} ({p.acres}%) – {p.timing}</li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    );
  };

  // Check if there's any coverage at all
  const hasAnyCoverage = Object.values(coverage).some(
    c => c.early.percent > 0 || c.mid.percent > 0 || c.late.percent > 0
  );

  if (!hasAnyCoverage) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">
          Add product roles to see function coverage across the season.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="bg-card rounded-lg border border-border p-4 space-y-2">
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1.5">
            <div className={`w-3 h-2 rounded-sm ${phaseColors.early}`} />
            Early
          </span>
          <span className="flex items-center gap-1.5">
            <div className={`w-3 h-2 rounded-sm ${phaseColors.mid}`} />
            Mid
          </span>
          <span className="flex items-center gap-1.5">
            <div className={`w-3 h-2 rounded-sm ${phaseColors.late}`} />
            Late
          </span>
        </div>

        {/* Function rows */}
        {FUNCTION_CATEGORIES.map(cat => {
          const cov = coverage[cat.id];
          const totalPresence = cov.early.percent + cov.mid.percent + cov.late.percent;
          
          // Only show functions that have some coverage
          if (totalPresence === 0) return null;
          
          return (
            <div key={cat.id} className="flex items-center gap-3">
              {/* Icon + Label */}
              <div className="flex items-center gap-2 w-32 shrink-0">
                <span className="text-base">{cat.icon}</span>
                <span className="text-sm font-medium text-foreground truncate">
                  {cat.label}
                </span>
              </div>
              
              {/* Three-segment bar */}
              <div className="flex-1 flex gap-0.5">
                <PhaseBar phase="early" data={cov.early} functionLabel={cat.label} />
                <PhaseBar phase="mid" data={cov.mid} functionLabel={cat.label} />
                <PhaseBar phase="late" data={cov.late} functionLabel={cat.label} />
              </div>
            </div>
          );
        })}

        {/* Show uncovered functions hint */}
        {FUNCTION_CATEGORIES.some(cat => {
          const cov = coverage[cat.id];
          return cov.early.percent === 0 && cov.mid.percent === 0 && cov.late.percent === 0;
        }) && (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            {FUNCTION_CATEGORIES.filter(cat => {
              const cov = coverage[cat.id];
              return cov.early.percent === 0 && cov.mid.percent === 0 && cov.late.percent === 0;
            }).map(c => c.icon).join(' ')} not covered
          </p>
        )}
      </div>
    </TooltipProvider>
  );
};
