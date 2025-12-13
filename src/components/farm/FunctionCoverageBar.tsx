import React from 'react';
import { Check, X } from 'lucide-react';
import type { Crop, Product } from '@/types/farm';
import type { ProductPurpose } from '@/types/productIntelligence';
import { FUNCTION_CATEGORIES, getTimingPhase, getRoleFunctionCategory } from '@/lib/functionCategories';

interface FunctionCoverageBarProps {
  crop: Crop;
  products: Product[];
  purposes: Record<string, ProductPurpose>;
}

export const FunctionCoverageBar: React.FC<FunctionCoverageBarProps> = ({
  crop,
  products,
  purposes,
}) => {
  // Build coverage map: functionId -> { early: boolean, mid: boolean, late: boolean }
  const coverage: Record<string, { early: boolean; mid: boolean; late: boolean }> = {};
  
  FUNCTION_CATEGORIES.forEach(cat => {
    coverage[cat.id] = { early: false, mid: false, late: false };
  });

  // Iterate through timings and their applications
  crop.applicationTimings.forEach((timing, idx) => {
    const phase = getTimingPhase(idx, crop.applicationTimings.length);
    const apps = crop.applications.filter(a => a.timingId === timing.id);
    
    apps.forEach(app => {
      const product = products.find(p => p.id === app.productId);
      if (!product) return;
      
      // Get roles from purpose or application.role fallback
      const purpose = purposes[product.id];
      const roles = purpose?.roles || [];
      
      // Also check if app has a role string we can match
      if (app.role) {
        // Simple string matching for legacy roles
        const roleStr = app.role.toLowerCase();
        if (roleStr.includes('root')) roles.push('rooting-vigor');
        if (roleStr.includes('carbon') || roleStr.includes('biology')) roles.push('carbon-biology-food');
        if (roleStr.includes('stress')) roles.push('stress-mitigation');
        if (roleStr.includes('nitrogen') || roleStr.includes('n eff')) roles.push('nitrogen-conversion');
      }
      
      roles.forEach(role => {
        const cat = getRoleFunctionCategory(role);
        if (cat && coverage[cat.id]) {
          coverage[cat.id][phase] = true;
        }
      });
    });
  });

  const PhaseIndicator: React.FC<{ covered: boolean; label: string }> = ({ covered, label }) => (
    <span className={`flex items-center gap-0.5 text-xs ${covered ? 'text-emerald-600' : 'text-muted-foreground/50'}`}>
      {covered ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      <span className="hidden sm:inline">{label}</span>
    </span>
  );

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h4 className="text-sm font-medium text-muted-foreground mb-3">Function Coverage</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FUNCTION_CATEGORIES.map(cat => {
          const cov = coverage[cat.id];
          const hasCoverage = cov.early || cov.mid || cov.late;
          
          return (
            <div 
              key={cat.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                hasCoverage ? 'bg-secondary/50' : 'bg-muted/30'
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              <span className={`text-sm font-medium flex-1 ${hasCoverage ? 'text-foreground' : 'text-muted-foreground'}`}>
                {cat.label}
              </span>
              <div className="flex items-center gap-1">
                <PhaseIndicator covered={cov.early} label="E" />
                <PhaseIndicator covered={cov.mid} label="M" />
                <PhaseIndicator covered={cov.late} label="L" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
