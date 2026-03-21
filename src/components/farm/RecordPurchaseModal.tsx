import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Droplets, Weight } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import type { SimplePurchase, SimplePurchaseLine, NewSimplePurchase, PackageUnitType } from '@/types/simplePurchase';
import type { NewPriceRecord, PriceRecord } from '@/types/priceRecord';
import type { Vendor, ProductMaster, VendorOffering } from '@/types';

interface PurchaseLineInput {
  id: string;
  productId: string;
  packageType: string;
  quantity: number;
  packageSize: number;
  packageUnit: PackageUnitType;
  unitPrice: number;
}

interface RecordPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (purchase: NewSimplePurchase) => Promise<SimplePurchase | null>;
  onCreatePriceRecords: (records: NewPriceRecord[]) => Promise<void>;
  vendors: Vendor[];
  products: ProductMaster[];
  vendorOfferings: VendorOffering[];
  priceRecords: PriceRecord[];
  currentSeasonId: string;
  currentSeasonYear: number;
  editingPurchase?: SimplePurchase;
  preselectedVendorId?: string;
  preselectedLines?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    packageType: string;
    packageSize: number;
    packageUnit: string;
    unitPrice: number;
  }>;
}

const PACKAGE_TYPES = ['Tote', 'Twin-pack', 'Jug', 'Bag', 'Drum', 'Pail', 'Bulk', 'Bottle', 'Case'];

// Package size defaults for auto-filling (fallback only - prefer VendorOffering data)
const PACKAGE_SIZE_DEFAULTS: Record<string, { size: number; unit: PackageUnitType }> = {
  'Tote': { size: 275, unit: 'gal' },
  'Twin-pack': { size: 5, unit: 'gal' },
  'Jug': { size: 2.5, unit: 'gal' },
  'Drum': { size: 30, unit: 'gal' },
  'Pail': { size: 5, unit: 'gal' },
  'Bag': { size: 50, unit: 'lbs' },
  'Bulk': { size: 1, unit: 'ton' },
  'Bottle': { size: 1, unit: 'qt' },
  'Case': { size: 12, unit: 'qt' },
};

export const RecordPurchaseModal: React.FC<RecordPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onCreatePriceRecords,
  vendors,
  products,
  vendorOfferings,
  priceRecords,
  currentSeasonId,
  currentSeasonYear,
  editingPurchase,
  preselectedVendorId,
  preselectedLines,
}) => {
  // Form state
  const [vendorId, setVendorId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'booked' | 'ordered' | 'received'>('booked');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<PurchaseLineInput[]>([]);
  const [freightCost, setFreightCost] = useState(0);
  const [freightNotes, setFreightNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [poRef, setPoRef] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter products based on selected vendor
  const vendorProducts = useMemo(() => {
    if (!vendorId) return [];
    const productIds = new Set(
      vendorOfferings
        .filter(o => o.vendorId === vendorId)
        .map(o => o.productId)
    );
    return products.filter(p => productIds.has(p.id));
  }, [vendorId, vendorOfferings, products]);

  // Get last per-unit price for a product+vendor combo
  const getLastPrice = (productId: string, currentVendorId: string): number => {
    // Find most recent price record for this product+vendor
    const records = priceRecords
      .filter(r => r.productId === productId && r.vendorId === currentVendorId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (records.length > 0) {
      // Use normalizedPrice (per-unit) — this is the $/gal, $/lb value
      return records[0].normalizedPrice || records[0].price;
    }
    
    // Fallback: check vendor offering (offering.price is already per-unit)
    const offering = vendorOfferings.find(
      o => o.productId === productId && o.vendorId === currentVendorId
    );
    if (offering) return offering.price;
    
    // Fallback: product estimated price
    const product = products.find(p => p.id === productId);
    return product?.estimatedPrice || 0;
  };

  // Handle vendor change - clear lines if vendor changes
  const handleVendorChange = (newVendorId: string) => {
    if (lines.length > 0 && newVendorId !== vendorId) {
      setLines([]);
    }
    setVendorId(newVendorId);
  };

  // Initialize form when editing
  useEffect(() => {
    if (editingPurchase) {
      setVendorId(editingPurchase.vendorId);
      setOrderDate(editingPurchase.orderDate);
      setStatus(editingPurchase.status as 'booked' | 'ordered' | 'received');
      setExpectedDeliveryDate(editingPurchase.expectedDeliveryDate || '');
      setReceivedDate(editingPurchase.receivedDate || new Date().toISOString().split('T')[0]);
      setFreightCost(editingPurchase.freightCost || 0);
      setFreightNotes(editingPurchase.freightNotes || '');
      setNotes(editingPurchase.notes || '');
      setPoRef(editingPurchase.poRef || '');
      setLines(editingPurchase.lines.map(line => ({
        id: line.id,
        productId: line.productId,
        packageType: line.packageType || 'Jug',
        quantity: line.quantity,
        packageSize: line.packageSize || 1,
        packageUnit: line.packageUnit || 'gal',
        unitPrice: line.unitPrice,
      })));
    } else if (preselectedVendorId && preselectedLines && preselectedLines.length > 0) {
      resetForm();
      setVendorId(preselectedVendorId);
      setLines(preselectedLines.map(pl => ({
        id: crypto.randomUUID(),
        productId: pl.productId,
        packageType: pl.packageType,
        quantity: pl.quantity,
        packageSize: pl.packageSize,
        packageUnit: pl.packageUnit as PackageUnitType,
        unitPrice: pl.unitPrice,
      })));
    } else {
      resetForm();
    }
  }, [editingPurchase, isOpen, preselectedVendorId]);

  const resetForm = () => {
    // Don't reset vendor/lines if preselected (Build Order flow)
    if (!preselectedVendorId) {
      setVendorId('');
      setLines([]);
    }
    setOrderDate(new Date().toISOString().split('T')[0]);
    setStatus('booked');
    setExpectedDeliveryDate('');
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setFreightCost(0);
    setFreightNotes('');
    setNotes('');
    setPoRef('');
  };

  const addLine = () => {
    setLines([...lines, {
      id: crypto.randomUUID(),
      productId: '',
      packageType: 'Jug',
      quantity: 1,
      packageSize: 2.5,
      packageUnit: 'gal',
      unitPrice: 0,
    }]);
  };

  const updateLine = (id: string, updates: Partial<PurchaseLineInput>) => {
    setLines(lines.map(line => line.id === id ? { ...line, ...updates } : line));
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(line => line.id !== id));
  };

  // Calculate line total: Price is per UNIT ($/gal, $/lb, $/ton), not per package
  // Total = Total Volume × Price per unit
  const calculateLineTotal = (line: PurchaseLineInput) => {
    return line.quantity * line.packageSize * line.unitPrice;
  };

  // Normalized price per unit is the same as unitPrice (already per-unit)
  const calculateNormalizedPrice = (line: PurchaseLineInput) => {
    return line.unitPrice;
  };

  // Calculate total volume for a line (total units across all containers)
  const calculateTotalVolume = (line: PurchaseLineInput) => {
    return line.quantity * line.packageSize;
  };

  // Calculate totals
  const subtotal = useMemo(() => 
    lines.reduce((sum, line) => sum + calculateLineTotal(line), 0),
    [lines]
  );

  const total = subtotal + freightCost;

  // Validation
  const isValid = vendorId && orderDate && lines.length > 0 && 
    lines.every(line => line.productId && line.quantity > 0 && line.unitPrice > 0);

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);

    try {
      // Build SimplePurchaseLine array
      const purchaseLines: SimplePurchaseLine[] = lines.map(line => ({
        id: line.id,
        productId: line.productId,
        quantity: line.quantity,
        packageType: line.packageType,
        packageSize: line.packageSize,
        packageUnit: line.packageUnit,
        unitPrice: line.unitPrice,
        totalPrice: calculateLineTotal(line),
        totalQuantity: line.quantity * line.packageSize,
        normalizedUnit: line.packageUnit,
        normalizedUnitPrice: calculateNormalizedPrice(line),
      }));

      // Build purchase
      const purchase: NewSimplePurchase = {
        seasonId: currentSeasonId,
        vendorId,
        status,
        orderDate,
        expectedDeliveryDate: (status === 'ordered' || status === 'booked') ? expectedDeliveryDate || undefined : undefined,
        receivedDate: status === 'received' ? receivedDate : undefined,
        lines: purchaseLines,
        freightCost,
        freightNotes: freightNotes || undefined,
        subtotal,
        total,
        notes: notes || undefined,
        poRef: poRef.trim() || undefined,
      };

      const savedPurchase = await onSave(purchase);
      
      if (savedPurchase) {
        // Create price records for each line (unitPrice is per-unit)
        const priceRecordsToCreate: NewPriceRecord[] = purchaseLines.map(line => ({
          productId: line.productId,
          vendorId,
          price: line.unitPrice,               // Per-unit price ($/gal, $/lb)
          unit: line.packageUnit || 'gal',
          normalizedPrice: line.unitPrice,      // Same as unitPrice (already per unit)
          packageType: line.packageType,
          packageSize: line.packageSize,
          packageUnit: line.packageUnit,
          quantityPurchased: line.quantity,
          date: status === 'received' ? receivedDate : orderDate,
          seasonYear: currentSeasonYear,
          type: 'purchased' as const,
          purchaseId: savedPurchase.id,
        }));

        await onCreatePriceRecords(priceRecordsToCreate);
      }

      onClose();
    } catch (error) {
      console.error('Error saving purchase:', error);
    } finally {
      setSaving(false);
    }
  };

  // Get product info for a line
  const getProductInfo = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  // Get vendor offering for a product
  const getVendorOffering = (productId: string) => {
    return vendorOfferings.find(o => o.productId === productId && o.vendorId === vendorId);
  };

  // Determine the appropriate default unit for a product based on its default_unit, offering, or form
  const getProductDefaultUnit = (product: ProductMaster, offering?: VendorOffering): PackageUnitType => {
    // First priority: vendor offering container unit (most specific)
    if (offering?.containerUnit) {
      return offering.containerUnit as PackageUnitType;
    }
    // Second priority: product's default unit
    if (product.defaultUnit) {
      const unit = product.defaultUnit.toLowerCase();
      if (['g', 'grams', 'gram'].includes(unit)) return 'g';
      if (['oz', 'ounce', 'ounces'].includes(unit)) return 'oz';
      if (['lbs', 'lb', 'pounds', 'pound'].includes(unit)) return 'lbs';
      if (['gal', 'gallon', 'gallons'].includes(unit)) return 'gal';
      if (['qt', 'quart', 'quarts'].includes(unit)) return 'qt';
      if (['pt', 'pint', 'pints'].includes(unit)) return 'pt';
    }
    // Fallback: infer from form
    return product.form === 'liquid' ? 'gal' : 'lbs';
  };

  // Handle package type change with auto-defaults from vendor offering
  const handlePackageTypeChange = (lineId: string, packageType: string, productId: string) => {
    const product = getProductInfo(productId);
    const offering = getVendorOffering(productId);
    
    // Try to get size from vendor offering first
    let packageSize = offering?.containerSize;
    let packageUnit: PackageUnitType = product ? getProductDefaultUnit(product, offering) : 'gal';
    
    // Fallback to defaults if no offering data
    if (!packageSize) {
      const defaults = PACKAGE_SIZE_DEFAULTS[packageType];
      packageSize = defaults?.size ?? 1;
      // Only use default unit if we don't have product-specific info
      if (!product?.defaultUnit && !offering?.containerUnit) {
        packageUnit = product?.form === 'dry' ? 'lbs' : (defaults?.unit ?? 'gal');
      }
    }
    
    updateLine(lineId, { 
      packageType,
      packageSize,
      packageUnit,
    });
  };

  // Handle product selection with price pre-fill and vendor offering defaults
  const handleProductChange = (lineId: string, productId: string) => {
    const prod = products.find(p => p.id === productId);
    const offering = getVendorOffering(productId);
    const lastPrice = getLastPrice(productId, vendorId);
    
    // Determine unit from offering or product
    const packageUnit = prod ? getProductDefaultUnit(prod, offering) : 'gal';
    
    // Get package size from offering if available
    const packageSize = offering?.containerSize || PACKAGE_SIZE_DEFAULTS['Jug']?.size || 2.5;
    
    updateLine(lineId, { 
      productId,
      packageUnit,
      packageSize,
      unitPrice: lastPrice,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingPurchase ? 'Edit Purchase' : 'Record Purchase'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Vendor & Dates Section */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select value={vendorId} onValueChange={handleVendorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order Date *</Label>
              <Input 
                type="date" 
                value={orderDate}
                onChange={e => setOrderDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>PO / Confirmation #</Label>
              <Input 
                type="text"
                placeholder="2026-0342"
                value={poRef}
                onChange={e => setPoRef(e.target.value)}
              />
            </div>
          </div>

          {/* Status Toggle */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={status === 'booked' ? 'default' : 'outline'}
                onClick={() => setStatus('booked')}
                className={status === 'booked' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                Booked
              </Button>
              <Button
                type="button"
                variant={status === 'ordered' ? 'default' : 'outline'}
                onClick={() => setStatus('ordered')}
                className={status === 'ordered' ? 'bg-amber-600 hover:bg-amber-700' : ''}
              >
                Ordered
              </Button>
              <Button
                type="button"
                variant={status === 'received' ? 'default' : 'outline'}
                onClick={() => setStatus('received')}
                className={status === 'received' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                Received
              </Button>
            </div>
            <p className="text-xs text-muted-foreground italic">
              {status === 'booked' && 'Estimated need — no firm commitment. Holds your place in vendor\'s allocation. You may use less.'}
              {status === 'ordered' && 'Firm commitment — product is coming and an invoice will follow. You owe this.'}
              {status === 'received' && 'Product is on your yard. Inventory will be updated.'}
            </p>
          </div>

          {/* Conditional date fields */}
          {(status === 'ordered' || status === 'booked') && (
            <div className="space-y-2">
              <Label>Expected Delivery Date</Label>
              <Input 
                type="date" 
                value={expectedDeliveryDate}
                onChange={e => setExpectedDeliveryDate(e.target.value)}
              />
            </div>
          )}
          {status === 'received' && (
            <div className="space-y-2">
              <Label>Received Date</Label>
              <Input 
                type="date" 
                value={receivedDate}
                onChange={e => setReceivedDate(e.target.value)}
              />
            </div>
          )}

          {/* Line Items Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Line Items</Label>
            
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_0.5fr_0.75fr_0.5fr_0.75fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
              <div>Product</div>
              <div>Package</div>
              <div>Qty</div>
              <div>Size</div>
              <div>Unit</div>
              <div>Total Vol</div>
              <div>$/Unit</div>
              <div>Total</div>
              <div></div>
            </div>

            {/* Line Items */}
            {lines.map(line => {
              const product = getProductInfo(line.productId);
              return (
                <React.Fragment key={line.id}>
                <div className="grid grid-cols-[2fr_1fr_0.5fr_0.75fr_0.5fr_0.75fr_1fr_1fr_auto] gap-2 items-center">
                  <Select 
                    value={line.productId} 
                    onValueChange={val => handleProductChange(line.id, val)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorProducts.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          No products for this vendor
                        </div>
                      ) : (
                        vendorProducts.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex items-center gap-2">
                              {p.form === 'liquid' ? (
                                <Droplets className="h-3 w-3 text-blue-500" />
                              ) : (
                                <Weight className="h-3 w-3 text-amber-600" />
                              )}
                              {p.name}
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={line.packageType} 
                    onValueChange={val => handlePackageTypeChange(line.id, val, line.productId)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKAGE_TYPES.map(pt => (
                        <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={e => updateLine(line.id, { quantity: Number(e.target.value) || 1 })}
                    className="h-9 text-sm"
                  />

                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={line.packageSize}
                    onChange={e => updateLine(line.id, { packageSize: Number(e.target.value) || 1 })}
                    className="h-9 text-sm"
                  />

                  <Select 
                    value={line.packageUnit} 
                    onValueChange={val => updateLine(line.id, { packageUnit: val as PackageUnitType })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gal">gal</SelectItem>
                      <SelectItem value="lbs">lbs</SelectItem>
                      <SelectItem value="ton">ton</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="oz">oz</SelectItem>
                      <SelectItem value="qt">qt</SelectItem>
                      <SelectItem value="pt">pt</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Total Volume Column */}
                  <div className="text-sm text-muted-foreground text-right pr-1">
                    {calculateTotalVolume(line).toFixed(1)} {line.packageUnit}
                  </div>

                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unitPrice}
                      onChange={e => updateLine(line.id, { unitPrice: Number(e.target.value) || 0 })}
                      className="h-9 text-sm pl-5"
                    />
                  </div>

                  <div className="text-sm font-medium text-right pr-2">
                    {formatCurrency(calculateLineTotal(line))}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(line.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {line.productId && line.quantity > 0 && line.packageSize > 0 && (
                  <div className="mb-2 px-3 py-1.5 bg-muted/50 rounded text-xs text-muted-foreground">
                    {line.quantity} × {line.packageSize} {line.packageUnit} = {calculateTotalVolume(line).toFixed(1)} {line.packageUnit} total
                    {line.unitPrice > 0 && (
                      <> · @ {formatCurrency(line.unitPrice)}/{line.packageUnit} = <strong className="text-foreground">{formatCurrency(calculateLineTotal(line))}</strong></>
                    )}
                  </div>
                )}
                </React.Fragment>
              );
            })}

            {/* Empty state with vendor hint */}
            {lines.length === 0 && (
              <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                {vendorId 
                  ? 'No items added. Click below to add a line item.'
                  : 'Select a vendor first to add products.'
                }
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={addLine}
              className="w-full"
              disabled={!vendorId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </div>

          {/* Freight Section */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Freight Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={freightCost}
                  onChange={e => setFreightCost(Number(e.target.value) || 0)}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Freight Notes</Label>
              <Input
                type="text"
                placeholder="e.g., Delivered to farm"
                value={freightNotes}
                onChange={e => setFreightNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Freight</span>
                <span>{formatCurrency(freightCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isValid || saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? 'Saving...' : 'Save Purchase'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};