import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, AlertTriangle, Check, Sparkles } from 'lucide-react';
import type { Product, Vendor, InventoryItem } from '@/types/farm';
import { parsePackagingString, getDefaultPackagingOptions, formatPackaging, type ParsedPackaging } from '@/lib/packagingUtils';
import { generateId } from '@/utils/farmUtils';

interface ProductContext {
  product: Product;
  vendor: Vendor | undefined;
  plannedUsage: number;
  onHand: number;
  status: 'ok' | 'low' | 'short';
  shortfall: number;
  usedIn: string[];
}

interface InventoryAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProduct: Product | null;
  productContext: ProductContext | null;
  vendorPackaging?: string; // From VendorOffering.packaging
  onBack: () => void;
  onAdd: (item: InventoryItem) => void;
}

export const InventoryAddModal: React.FC<InventoryAddModalProps> = ({
  open,
  onOpenChange,
  selectedProduct,
  productContext,
  vendorPackaging,
  onBack,
  onAdd,
}) => {
  const [selectedPackaging, setSelectedPackaging] = useState<string>('');
  const [containerCount, setContainerCount] = useState<number>(1);

  // Get available packaging options
  const packagingOptions = useMemo(() => {
    if (!selectedProduct) return [];
    
    const options: ParsedPackaging[] = [];
    
    // Try to parse vendor packaging first
    const parsed = parsePackagingString(vendorPackaging);
    if (parsed) {
      options.push(parsed);
    }
    
    // Add default options based on product form
    const defaults = getDefaultPackagingOptions(selectedProduct.form);
    defaults.forEach(opt => {
      // Don't add duplicates
      if (!options.find(o => o.name === opt.name && o.unitSize === opt.unitSize)) {
        options.push(opt);
      }
    });
    
    return options;
  }, [selectedProduct, vendorPackaging]);

  // Get selected packaging details
  const currentPackaging = useMemo(() => {
    if (!selectedPackaging || !packagingOptions.length) return null;
    const [name, sizeStr] = selectedPackaging.split('|');
    const size = parseFloat(sizeStr);
    return packagingOptions.find(p => p.name === name && p.unitSize === size) || null;
  }, [selectedPackaging, packagingOptions]);

  // Calculate total volume
  const totalVolume = currentPackaging ? containerCount * currentPackaging.unitSize : 0;

  // Smart suggestions based on shortfall
  const suggestions = useMemo(() => {
    if (!productContext || !currentPackaging || productContext.shortfall <= 0) return [];
    
    const shortfall = productContext.shortfall;
    const containerSize = currentPackaging.unitSize;
    
    // Calculate containers needed to cover shortfall (rounded up)
    const toCoversShortfall = Math.ceil(shortfall / containerSize);
    
    // Calculate containers to cover full plan
    const toCoverFullPlan = Math.ceil(productContext.plannedUsage / containerSize);
    const existingContainers = Math.floor(productContext.onHand / containerSize);
    const additionalForFullPlan = Math.max(0, toCoverFullPlan - existingContainers);
    
    return [
      {
        label: 'Cover shortfall',
        count: toCoversShortfall,
        description: `Add ${toCoversShortfall} to cover ~${shortfall.toFixed(1)} ${currentPackaging.unitType} shortage`,
      },
      ...(additionalForFullPlan !== toCoversShortfall ? [{
        label: 'Cover full plan',
        count: additionalForFullPlan,
        description: `Add ${additionalForFullPlan} to fully cover plan`,
      }] : []),
    ];
  }, [productContext, currentPackaging]);

  // Set default packaging when options change
  React.useEffect(() => {
    if (packagingOptions.length > 0 && !selectedPackaging) {
      const first = packagingOptions[0];
      setSelectedPackaging(`${first.name}|${first.unitSize}`);
    }
  }, [packagingOptions, selectedPackaging]);

  // Reset when modal opens with new product
  React.useEffect(() => {
    if (open && selectedProduct) {
      setContainerCount(1);
      setSelectedPackaging('');
    }
  }, [open, selectedProduct?.id]);

  const handleAdd = () => {
    if (!selectedProduct || !currentPackaging) return;
    
    const item: InventoryItem = {
      id: generateId(),
      productId: selectedProduct.id,
      quantity: totalVolume,
      unit: currentPackaging.unitType,
      packagingName: currentPackaging.name,
      packagingSize: currentPackaging.unitSize,
      containerCount: containerCount,
    };
    
    onAdd(item);
    onOpenChange(false);
  };

  if (!selectedProduct || !productContext) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>Add Inventory</DialogTitle>
          </div>
        </DialogHeader>
        
        {/* Product Context Card */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {productContext.vendor?.name || 'Unknown Vendor'}
            </p>
            <h3 className="font-semibold text-lg">{selectedProduct.name}</h3>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">On Hand</p>
              <p className="font-medium">
                {productContext.onHand.toFixed(1)} {selectedProduct.form === 'liquid' ? 'gal' : 'lbs'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Plan Needs</p>
              <p className="font-medium">
                {productContext.plannedUsage.toFixed(1)} {selectedProduct.form === 'liquid' ? 'gal' : 'lbs'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              {productContext.status === 'short' ? (
                <Badge variant="destructive" className="gap-1 mt-0.5">
                  <AlertTriangle className="h-3 w-3" />
                  Short
                </Badge>
              ) : productContext.status === 'low' ? (
                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 mt-0.5">
                  Low
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 gap-1 mt-0.5">
                  <Check className="h-3 w-3" />
                  OK
                </Badge>
              )}
            </div>
          </div>
          
          {productContext.usedIn.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground text-xs mb-1">Used In</p>
                <p className="text-sm">{productContext.usedIn.join(', ')}</p>
              </div>
            </>
          )}
        </div>
        
        {/* Packaging Selection */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Package Type</Label>
            <Select value={selectedPackaging} onValueChange={setSelectedPackaging}>
              <SelectTrigger>
                <SelectValue placeholder="Select packaging..." />
              </SelectTrigger>
              <SelectContent>
                {packagingOptions.map((opt) => (
                  <SelectItem key={`${opt.name}|${opt.unitSize}`} value={`${opt.name}|${opt.unitSize}`}>
                    {formatPackaging(opt.name, opt.unitSize, opt.unitType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Container Count */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                value={containerCount}
                onChange={(e) => setContainerCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24"
              />
              <span className="text-muted-foreground">
                {currentPackaging?.name?.toLowerCase() || 'container'}{containerCount > 1 ? 's' : ''}
              </span>
            </div>
            {currentPackaging && (
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-medium text-foreground">{totalVolume.toFixed(1)} {currentPackaging.unitType}</span>
              </p>
            )}
          </div>
          
          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Quick Actions
              </Label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((sug) => (
                  <Button
                    key={sug.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setContainerCount(sug.count)}
                    className={containerCount === sug.count ? 'border-primary bg-primary/5' : ''}
                  >
                    {sug.label} ({sug.count})
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!currentPackaging || containerCount < 1}>
            <Package className="h-4 w-4 mr-2" />
            Add {containerCount} {currentPackaging?.name?.toLowerCase() || 'container'}{containerCount > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
