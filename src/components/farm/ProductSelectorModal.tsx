import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, ChevronDown, Droplet, Weight, AlertTriangle, Check, Package, Ban, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import type { Product, Vendor, Season, InventoryItem } from '@/types/farm';
import { calculatePlannedUsage } from '@/lib/calculations';
import { canAddToPlan } from '@/lib/pricingUtils';

export interface ProductWithContext {
  product: Product;
  vendor: Vendor | undefined;
  plannedUsage: number;
  onHand: number;
  status: 'ok' | 'low' | 'short';
  shortfall: number;
  usedIn: string[]; // "Corn → In Furrow"
  canAddToPlan: boolean; // Whether product has valid pricing
}

interface ProductSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  currentSeason: Season | null;
  onSelectProduct: (product: Product, context: ProductWithContext) => void;
}

export const ProductSelectorModal: React.FC<ProductSelectorModalProps> = ({
  open,
  onOpenChange,
  products,
  vendors,
  inventory,
  currentSeason,
  onSelectProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOtherProducts, setShowOtherProducts] = useState(false);

  // Calculate context for all products
  const productsWithContext = useMemo(() => {
    // Get all planned usage items for the season
    const plannedUsageItems = calculatePlannedUsage(currentSeason, products);
    
    return products.map(product => {
      const vendor = vendors.find(v => v.id === product.vendorId);
      
      // Calculate on-hand inventory
      const inventoryItems = inventory.filter(i => i.productId === product.id);
      const onHand = inventoryItems.reduce((sum, i) => sum + i.quantity, 0);
      
      // Get planned usage from pre-calculated items
      const usageItem = plannedUsageItems.find(u => u.productId === product.id);
      const plannedUsage = usageItem?.totalNeeded || 0;
      
      // Build usedIn list from usage details
      const usedIn: string[] = usageItem?.usages.map(u => `${u.cropName} → ${u.timingName}`) || [];
      
      const shortfall = Math.max(0, plannedUsage - onHand);
      let status: 'ok' | 'low' | 'short' = 'ok';
      if (shortfall > 0) {
        status = 'short';
      } else if (plannedUsage > 0 && onHand < plannedUsage * 1.1) {
        status = 'low';
      }
      
      // Check if product can be added to plan (has price)
      // Legacy products have vendorId + price, so check if price > 0
      const productCanAddToPlan = product.price !== undefined && product.price > 0;
      
      return {
        product,
        vendor,
        plannedUsage,
        onHand,
        status,
        shortfall,
        usedIn,
        canAddToPlan: productCanAddToPlan,
      };
    });
  }, [products, vendors, inventory, currentSeason]);

  // Split into \"Used in Plan\" and \"Other\"
  const { usedInPlan, otherProducts } = useMemo(() => {
    const filtered = productsWithContext.filter(p => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.product.name.toLowerCase().includes(query) ||
        p.vendor?.name.toLowerCase().includes(query)
      );
    });
    
    return {
      usedInPlan: filtered.filter(p => p.usedIn.length > 0),
      otherProducts: filtered.filter(p => p.usedIn.length === 0),
    };
  }, [productsWithContext, searchQuery]);

  const getStatusBadge = (ctx: ProductWithContext) => {
    if (ctx.status === 'short') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Short {ctx.shortfall.toFixed(1)} {ctx.product.form === 'liquid' ? 'gal' : 'lbs'}
        </Badge>
      );
    }
    if (ctx.status === 'low') {
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          Low
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
        <Check className="h-3 w-3" />
        On Hand
      </Badge>
    );
  };

  const handleSelectProduct = (ctx: ProductWithContext) => {
    if (!ctx.canAddToPlan) {
      toast.error('Cannot add to plan', {
        description: 'This product has no price set. Add a vendor or estimated price first.',
      });
      return;
    }
    onSelectProduct(ctx.product, ctx);
  };

  const ProductRow: React.FC<{ ctx: ProductWithContext }> = ({ ctx }) => (
    <button
      className={`w-full p-3 text-left rounded-lg border transition-colors ${
        ctx.canAddToPlan 
          ? 'border-border/50 hover:border-primary/30 hover:bg-accent/50 cursor-pointer'
          : 'border-border/30 bg-muted/30 cursor-not-allowed opacity-60'
      }`}
      onClick={() => handleSelectProduct(ctx)}
      disabled={!ctx.canAddToPlan}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Vendor name */}
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
            {ctx.vendor?.name || 'Unknown Vendor'}
          </p>
          
          {/* Product name with form icon */}
          <div className="flex items-center gap-2">
            {ctx.product.form === 'liquid' ? (
              <Droplet className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
            ) : (
              <Weight className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
            )}
            <span className="font-medium truncate">{ctx.product.name}</span>
            {!ctx.canAddToPlan && (
              <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 gap-0.5">
                <Ban className="h-2.5 w-2.5" />
                No price
              </Badge>
            )}
          </div>
          
          {/* Where used */}
          {ctx.usedIn.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {ctx.usedIn.slice(0, 2).join(', ')}
              {ctx.usedIn.length > 2 && ` +${ctx.usedIn.length - 2} more`}
            </p>
          )}
        </div>
        
        {/* Status badge */}
        <div className="flex-shrink-0">
          {ctx.canAddToPlan ? getStatusBadge(ctx) : null}
        </div>
      </div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Select Product
          </DialogTitle>
        </DialogHeader>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* Used in Current Plan */}
          {usedInPlan.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                Used in Current Plan
                <Badge variant="outline" className="text-xs">
                  {usedInPlan.length}
                </Badge>
              </h3>
              <div className="space-y-2">
                {usedInPlan.map(ctx => (
                  <ProductRow key={ctx.product.id} ctx={ctx} />
                ))}
              </div>
            </div>
          )}
          
          {/* Other Products */}
          {otherProducts.length > 0 && (
            <Collapsible open={showOtherProducts} onOpenChange={setShowOtherProducts}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                  <span>Other Products ({otherProducts.length})</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showOtherProducts ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-2">
                  {otherProducts.map(ctx => (
                    <ProductRow key={ctx.product.id} ctx={ctx} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          
          {usedInPlan.length === 0 && otherProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No products found</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
