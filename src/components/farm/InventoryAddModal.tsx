import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Package, 
  AlertTriangle, 
  Check, 
  ClipboardList, 
  Calendar, 
  FileText, 
  TrendingUp 
} from 'lucide-react';
import type { Product, ProductMaster, InventoryItem, PriceBookEntry, Season } from '@/types';
import type { Vendor as FarmVendor } from '@/types/farm';
import type { Vendor as FullVendor } from '@/types';
import { parsePackagingString, getDefaultPackagingOptions, formatPackaging, type ParsedPackaging } from '@/lib/packagingUtils';
import { generateId } from '@/utils/farmUtils';

type InventoryMode = 'purchase' | 'adjustment';
type PriceInputMode = 'perUnit' | 'perPackage';
type AdjustmentReason = 'carryover' | 'transfer' | 'correction' | 'sample';

// Support both legacy Product and new ProductMaster
type ProductLike = Product | ProductMaster;

// Support either vendor type
type VendorLike = FarmVendor | FullVendor;

interface ProductContext {
  product: ProductLike;
  vendor: VendorLike | undefined;
  plannedUsage: number;
  onHand: number;
  status: 'ok' | 'low' | 'short';
  shortfall: number;
  usedIn: string[];
}

interface InventoryAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProduct: ProductLike | null;
  productContext: ProductContext | null;
  vendorPackaging?: string;
  vendors?: VendorLike[];
  seasons?: Season[];
  priceBook?: PriceBookEntry[];
  currentSeasonId?: string | null;
  onBack: () => void;
  onAdd: (item: InventoryItem, purchaseData?: PurchaseData) => void;
}

export interface PurchaseData {
  vendorId: string;
  unitPrice: number;
  totalCost: number;
  purchaseDate: string;
  invoiceNumber?: string;
  seasonId: string;
}

function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Helper to get product form
function getProductForm(product: ProductLike): 'liquid' | 'dry' {
  return product.form || 'liquid';
}

export const InventoryAddModal: React.FC<InventoryAddModalProps> = ({
  open,
  onOpenChange,
  selectedProduct,
  productContext,
  vendorPackaging,
  vendors,
  seasons,
  priceBook,
  currentSeasonId,
  onBack,
  onAdd,
}) => {
  // Mode
  const [mode, setMode] = useState<InventoryMode>('purchase');
  
  // Packaging & quantity
  const [selectedPackaging, setSelectedPackaging] = useState<string>('');
  const [containerCount, setContainerCount] = useState<number>(1);
  
  // Purchase mode fields
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [priceInputMode, setPriceInputMode] = useState<PriceInputMode>('perUnit');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(currentSeasonId || '');
  
  // Adjustment mode fields
  const [adjustmentReason, setAdjustmentReason] = useState<AdjustmentReason>('carryover');
  const [adjustmentNote, setAdjustmentNote] = useState<string>('');

  // Get unit based on product form
  const unit = selectedProduct?.form === 'liquid' ? 'gal' : 'lbs';

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

  // Calculate total quantity
  const totalQuantity = currentPackaging ? containerCount * currentPackaging.unitSize : 0;

  // Get last price from price book for this product
  const lastPrice = useMemo(() => {
    if (!selectedProduct) return null;
    const productPrices = priceBook
      .filter(p => p.productId === selectedProduct.id)
      .sort((a, b) => {
        const dateA = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0;
        const dateB = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0;
        return dateB - dateA;
      });
    return productPrices[0] || null;
  }, [selectedProduct, priceBook]);

  // Calculate total cost based on price input mode
  const totalCost = useMemo(() => {
    if (priceInputMode === 'perUnit') {
      return totalQuantity * unitPrice;
    } else {
      return containerCount * unitPrice;
    }
  }, [unitPrice, totalQuantity, containerCount, priceInputMode]);

  // Calculate effective unit price
  const effectiveUnitPrice = useMemo(() => {
    if (priceInputMode === 'perUnit') {
      return unitPrice;
    } else {
      return currentPackaging && currentPackaging.unitSize > 0 
        ? unitPrice / currentPackaging.unitSize 
        : unitPrice;
    }
  }, [unitPrice, priceInputMode, currentPackaging]);

  // Coverage calculations
  const shortage = productContext ? productContext.shortfall : 0;
  const coversNeed = shortage <= 0 || totalQuantity >= shortage;
  const surplus = totalQuantity - shortage;

  // Form validation
  const isValid = mode === 'purchase' 
    ? selectedVendorId && unitPrice > 0 && containerCount > 0 && selectedSeasonId
    : containerCount > 0;

  // Get packaging name for display
  const packagingName = currentPackaging?.name?.toLowerCase() || 'container';
  const packagingNamePlural = containerCount > 1 ? `${packagingName}s` : packagingName;

  // Set default packaging when options change
  useEffect(() => {
    if (packagingOptions.length > 0 && !selectedPackaging) {
      const first = packagingOptions[0];
      setSelectedPackaging(`${first.name}|${first.unitSize}`);
    }
  }, [packagingOptions, selectedPackaging]);

  // Set default vendor when product context has one
  useEffect(() => {
    if (productContext?.vendor && !selectedVendorId) {
      setSelectedVendorId(productContext.vendor.id);
    }
  }, [productContext, selectedVendorId]);

  // Set initial price from last price book entry
  useEffect(() => {
    if (lastPrice && unitPrice === 0) {
      setUnitPrice(lastPrice.price);
    }
  }, [lastPrice, unitPrice]);

  // Reset when modal opens with new product
  useEffect(() => {
    if (open && selectedProduct) {
      setMode('purchase');
      setContainerCount(1);
      setSelectedPackaging('');
      setUnitPrice(0);
      setPriceInputMode('perUnit');
      setInvoiceNumber('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setSelectedSeasonId(currentSeasonId || '');
      setAdjustmentReason('carryover');
      setAdjustmentNote('');
      setSelectedVendorId('');
    }
  }, [open, selectedProduct?.id, currentSeasonId]);

  const handleAdd = () => {
    if (!selectedProduct || !currentPackaging) return;
    
    const item: InventoryItem = {
      id: generateId(),
      productId: selectedProduct.id,
      quantity: totalQuantity,
      unit: currentPackaging.unitType,
      packagingName: currentPackaging.name,
      packagingSize: currentPackaging.unitSize,
      containerCount: containerCount,
      receivedDate: purchaseDate,
    };
    
    if (mode === 'purchase' && selectedVendorId && selectedSeasonId) {
      const purchaseData: PurchaseData = {
        vendorId: selectedVendorId,
        unitPrice: effectiveUnitPrice,
        totalCost,
        purchaseDate,
        invoiceNumber: invoiceNumber || undefined,
        seasonId: selectedSeasonId,
      };
      onAdd(item, purchaseData);
    } else {
      onAdd(item);
    }
    
    onOpenChange(false);
  };

  if (!selectedProduct || !productContext) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>Add Inventory</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-5">
          {/* Product Info Card */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {productContext.vendor?.name || 'Unknown Vendor'}
              </p>
              <h3 className="text-xl font-bold">{selectedProduct.name}</h3>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">On Hand</p>
                <p className="font-semibold">{formatNumber(productContext.onHand, 1)} {unit}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Plan Needs</p>
                <p className="font-semibold">{formatNumber(productContext.plannedUsage, 1)} {unit}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                {productContext.status === 'short' ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Short
                  </Badge>
                ) : productContext.status === 'low' ? (
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                    Low
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 gap-1">
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
                  <p className="text-xs text-muted-foreground mb-1">Used In</p>
                  <p className="text-sm">{productContext.usedIn.join(', ')}</p>
                </div>
              </>
            )}
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setMode('purchase')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'purchase'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="w-4 h-4" />
              Purchase
            </button>
            <button
              onClick={() => setMode('adjustment')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'adjustment'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Adjustment
            </button>
          </div>

          {/* Package Type */}
          <div className="space-y-2">
            <Label>Package Type</Label>
            <Select value={selectedPackaging} onValueChange={setSelectedPackaging}>
              <SelectTrigger className="rounded-xl">
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

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                value={containerCount}
                onChange={(e) => setContainerCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 rounded-xl"
              />
              <span className="text-muted-foreground">{packagingNamePlural}</span>
              <span className="text-muted-foreground">=</span>
              <span className="font-semibold">
                {formatNumber(totalQuantity, 1)} {unit} total
              </span>
            </div>
            
            {/* Coverage indicator */}
            {shortage > 0 && (
              <div className={`text-sm ${coversNeed ? 'text-green-600' : 'text-amber-600'}`}>
                {coversNeed ? (
                  <>✓ Covers plan need ({formatNumber(shortage, 1)} {unit}){surplus > 0.1 && ` + ${formatNumber(surplus, 1)} ${unit} extra`}</>
                ) : (
                  <>⚠ Still short {formatNumber(shortage - totalQuantity, 1)} {unit} after this</>
                )}
              </div>
            )}
          </div>

          {/* Purchase-specific fields */}
          {mode === 'purchase' && (
            <div className="border-t border-border pt-5 space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide">
                Purchase Details
              </h4>

              {/* Vendor */}
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} {productContext.vendor?.id === v.id ? '(default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label>Unit Price</Label>
                
                {/* Last price hint */}
                {lastPrice && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    <span>Last purchased at ${formatNumber(lastPrice.price, 2)}/{lastPrice.unit || unit}</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      className="pl-7 rounded-xl"
                    />
                  </div>
                  <Select value={priceInputMode} onValueChange={(v) => setPriceInputMode(v as PriceInputMode)}>
                    <SelectTrigger className="w-24 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="perUnit">/{unit}</SelectItem>
                      <SelectItem value="perPackage">/{packagingName}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Total calculation */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {priceInputMode === 'perPackage' && `($${formatNumber(effectiveUnitPrice, 2)}/${unit})`}
                  </span>
                  <span className="font-semibold">
                    Total: ${formatNumber(totalCost, 2)}
                  </span>
                </div>
              </div>

              {/* Date and Invoice */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Date
                  </Label>
                  <Input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Invoice # <span className="text-muted-foreground font-normal">(opt)</span>
                  </Label>
                  <Input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-2024-..."
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Season */}
              <div className="space-y-2">
                <Label>Season</Label>
                <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select season..." />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.year} – {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Adjustment-specific fields */}
          {mode === 'adjustment' && (
            <div className="border-t border-border pt-5 space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide">
                Adjustment Details
              </h4>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={adjustmentReason} onValueChange={(v) => setAdjustmentReason(v as AdjustmentReason)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carryover">Carryover from last season</SelectItem>
                    <SelectItem value="transfer">Transfer from another location</SelectItem>
                    <SelectItem value="correction">Inventory count correction</SelectItem>
                    <SelectItem value="sample">Vendor sample / gift</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Note <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  placeholder="Add a note about this adjustment..."
                  rows={2}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <DialogFooter className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!isValid}
            className="flex-1 rounded-xl"
          >
            <Package className="w-4 h-4 mr-2" />
            {mode === 'purchase' ? (
              <span>
                Purchase {containerCount} {packagingNamePlural}
                <span className="opacity-80 ml-1">(${formatNumber(totalCost, 2)})</span>
              </span>
            ) : (
              <span>Add {containerCount} {packagingNamePlural}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
