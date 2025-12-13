import React from 'react';
import { FileText, ExternalLink, Beaker, Leaf, Zap, Droplets } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import type { Product } from '@/types/farm';
import type { ProductAnalysis, ProductPurpose, ProductRole, ApplicationOverride } from '@/types/productIntelligence';
import { PRODUCT_ROLE_LABELS } from '@/types/productIntelligence';
import { formatNumber } from '@/utils/farmUtils';

interface ProductHoverCardProps {
  children: React.ReactNode;
  product: Product;
  analysis?: ProductAnalysis | null;
  purpose?: ProductPurpose | null;
  passOverride?: ApplicationOverride | null;
  computedNutrients?: {
    n: number;
    p: number;
    k: number;
    s: number;
  };
  onViewLabel?: () => void;
}

const RolePill: React.FC<{ role: ProductRole }> = ({ role }) => {
  const iconMap: Partial<Record<ProductRole, React.ReactNode>> = {
    'fertility-macro': <Leaf className="w-3 h-3" />,
    'fertility-micro': <Beaker className="w-3 h-3" />,
    'biostimulant': <Zap className="w-3 h-3" />,
    'carbon-biology-food': <Droplets className="w-3 h-3" />,
  };

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
      {iconMap[role]}
      {PRODUCT_ROLE_LABELS[role] || role}
    </span>
  );
};

export const ProductHoverCard: React.FC<ProductHoverCardProps> = ({
  children,
  product,
  analysis,
  purpose,
  passOverride,
  computedNutrients,
  onViewLabel,
}) => {
  // Get roles from purpose or pass override
  const roles = passOverride?.customRoles || purpose?.roles || [];
  
  // Get "why here" explanation - pass override takes precedence
  const whyHere = passOverride?.whyHere || purpose?.primaryObjective;
  
  // Format nutrients for display
  const hasNutrients = computedNutrients && (
    computedNutrients.n > 0 || computedNutrients.p > 0 || 
    computedNutrients.k > 0 || computedNutrients.s > 0
  );

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 p-0 bg-card border border-border shadow-xl"
        side="right"
        align="start"
      >
        <div className="p-4 border-b border-border">
          <h4 className="font-semibold text-foreground">{product.name}</h4>
          
          {/* Roles */}
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {roles.map((role) => (
                <RolePill key={role} role={role} />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {/* Why Here */}
          {whyHere && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Why here
              </p>
              <p className="text-sm text-foreground/90 italic">
                "{whyHere}"
              </p>
            </div>
          )}

          {/* Contributes (Nutrients) */}
          {hasNutrients && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Contributes
              </p>
              <div className="flex gap-3 text-sm">
                {computedNutrients.n > 0 && (
                  <span className="text-foreground">
                    <span className="font-semibold text-emerald-600">N:</span> {formatNumber(computedNutrients.n, 2)}
                  </span>
                )}
                {computedNutrients.p > 0 && (
                  <span className="text-foreground">
                    <span className="font-semibold text-blue-600">P:</span> {formatNumber(computedNutrients.p, 2)}
                  </span>
                )}
                {computedNutrients.k > 0 && (
                  <span className="text-foreground">
                    <span className="font-semibold text-purple-600">K:</span> {formatNumber(computedNutrients.k, 2)}
                  </span>
                )}
                {computedNutrients.s > 0 && (
                  <span className="text-foreground">
                    <span className="font-semibold text-amber-600">S:</span> {formatNumber(computedNutrients.s, 2)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Synergies */}
          {purpose?.synergies && purpose.synergies.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Synergies
              </p>
              <p className="text-sm text-foreground/80">
                {purpose.synergies.join(', ')}
              </p>
            </div>
          )}

          {/* Watch-outs */}
          {purpose?.watchOuts && purpose.watchOuts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">
                Watch-outs
              </p>
              <p className="text-sm text-amber-700">
                {purpose.watchOuts.join('; ')}
              </p>
            </div>
          )}

          {/* When it matters */}
          {purpose?.whenItMatters && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                When it matters
              </p>
              <p className="text-sm text-foreground/80">
                {purpose.whenItMatters}
              </p>
            </div>
          )}
        </div>

        {/* Footer with data source */}
        <div className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {analysis?.userConfirmed 
              ? 'Analysis from label (confirmed)' 
              : analysis 
                ? `Analysis extracted (${analysis.extractionConfidence})` 
                : 'No analysis data'}
          </span>
          {onViewLabel && (
            <button
              onClick={onViewLabel}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <FileText className="w-3 h-3" />
              View PDF
            </button>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
