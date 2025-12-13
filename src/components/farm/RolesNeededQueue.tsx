import React from 'react';
import { Sparkles, ChevronRight, AlertCircle } from 'lucide-react';
import type { Product } from '@/types/farm';
import type { ProductPurpose } from '@/types/productIntelligence';

interface RolesNeededQueueProps {
  products: Product[];
  purposes: Record<string, ProductPurpose>;
  onSelectProduct: (productId: string) => void;
  maxVisible?: number;
}

export const RolesNeededQueue: React.FC<RolesNeededQueueProps> = ({
  products,
  purposes,
  onSelectProduct,
  maxVisible = 5,
}) => {
  // Find products that don't have confirmed roles
  const productsNeedingRoles = products.filter(product => {
    const purpose = purposes[product.id];
    // No purpose at all, or roles not confirmed
    return !purpose?.roles?.length || !purpose?.rolesConfirmed;
  });

  if (productsNeedingRoles.length === 0) {
    return null;
  }

  const visibleProducts = productsNeedingRoles.slice(0, maxVisible);
  const remainingCount = productsNeedingRoles.length - maxVisible;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <h4 className="font-medium text-foreground">
            Products Missing Roles
          </h4>
          <span className="ml-auto px-2 py-0.5 bg-amber-500/20 text-amber-700 rounded-full text-xs font-medium">
            {productsNeedingRoles.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Assign roles to enable Function Coverage insights
        </p>
      </div>

      {/* Product List */}
      <div className="divide-y divide-border">
        {visibleProducts.map(product => {
          const purpose = purposes[product.id];
          const hasRolesNotConfirmed = purpose?.roles?.length && !purpose?.rolesConfirmed;
          
          return (
            <button
              key={product.id}
              onClick={() => onSelectProduct(product.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {product.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasRolesNotConfirmed 
                    ? `${purpose.roles.length} role${purpose.roles.length !== 1 ? 's' : ''} pending confirmation`
                    : 'No roles assigned'
                  }
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Show more indicator */}
      {remainingCount > 0 && (
        <div className="px-4 py-2 bg-muted/30 text-center">
          <span className="text-xs text-muted-foreground">
            +{remainingCount} more product{remainingCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};
