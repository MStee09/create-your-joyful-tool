import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, X } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import type { SimplePurchase, SimplePurchaseLine, NewSimplePurchase } from '@/types/simplePurchase';
import type { NewPriceRecord } from '@/types/priceRecord';
import type { Vendor, ProductMaster } from '@/types';

interface PurchaseLineInput {
  id: string;
  productId: string;
  packageType: string;
  quantity: number;
  packageSize: number;
  packageUnit: 'gal' | 'lbs';
  unitPrice: number;
}

interface RecordPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (purchase: NewSimplePurchase) => Promise<SimplePurchase | null>;
  onCreatePriceRecords: (records: NewPriceRecord[]) => Promise<void>;
  vendors: Vendor[];
  products: ProductMaster[];
  currentSeasonId: string;
  currentSeasonYear: number;
  editingPurchase?: SimplePurchase;
}

const PACKAGE_TYPES = ['Tote', 'Twin-pack', 'Jug', 'Bag', 'Drum', 'Bulk'];

export const RecordPurchaseModal: React.FC<RecordPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onCreatePriceRecords,
  vendors,
  products,
  currentSeasonId,
  currentSeasonYear,
  editingPurchase,
}) => {
  // Form state
  const [vendorId, setVendorId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'ordered' | 'received'>('received');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<PurchaseLineInput[]>([]);
  const [freightCost, setFreightCost] = useState(0);
  const [freightNotes, setFreightNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (editingPurchase) {
      setVendorId(editingPurchase.vendorId);
      setOrderDate(editingPurchase.orderDate);
      setStatus(editingPurchase.status);
      setExpectedDeliveryDate(editingPurchase.expectedDeliveryDate || '');
      setReceivedDate(editingPurchase.receivedDate || new Date().toISOString().split('T')[0]);
      setFreightCost(editingPurchase.freightCost || 0);
      setFreightNotes(editingPurchase.freightNotes || '');
      setNotes(editingPurchase.notes || '');
      setLines(editingPurchase.lines.map(line => ({
        id: line.id,
        productId: line.productId,
        packageType: line.packageType || 'Jug',
        quantity: line.quantity,
        packageSize: line.packageSize || 1,
        packageUnit: line.packageUnit || 'gal',
        unitPrice: line.unitPrice,
      })));
    } else {
      resetForm();
    }
  }, [editingPurchase, isOpen]);

  const resetForm = () => {
    setVendorId('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setStatus('received');
    setExpectedDeliveryDate('');
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setLines([]);
    setFreightCost(0);
    setFreightNotes('');
    setNotes('');
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

  // Calculate line totals
  const calculateLineTotal = (line: PurchaseLineInput) => {
    return line.quantity * line.unitPrice;
  };

  const calculateNormalizedPrice = (line: PurchaseLineInput) => {
    if (line.packageSize <= 0) return line.unitPrice;
    return line.unitPrice / line.packageSize;
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
        expectedDeliveryDate: status === 'ordered' ? expectedDeliveryDate || undefined : undefined,
        receivedDate: status === 'received' ? receivedDate : undefined,
        lines: purchaseLines,
        freightCost,
        freightNotes: freightNotes || undefined,
        subtotal,
        total,
        notes: notes || undefined,
      };

      const savedPurchase = await onSave(purchase);
      
      if (savedPurchase) {
        // Create price records for each line
        const priceRecords: NewPriceRecord[] = purchaseLines.map(line => ({
          productId: line.productId,
          vendorId,
          price: line.unitPrice,
          unit: line.packageUnit || 'gal',
          normalizedPrice: line.normalizedUnitPrice,
          packageType: line.packageType,
          packageSize: line.packageSize,
          packageUnit: line.packageUnit,
          quantityPurchased: line.quantity,
          date: status === 'received' ? receivedDate : orderDate,
          seasonYear: currentSeasonYear,
          type: 'purchased' as const,
          purchaseId: savedPurchase.id,
        }));

        await onCreatePriceRecords(priceRecords);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingPurchase ? 'Edit Purchase' : 'Record Purchase'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Vendor & Dates Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
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
          </div>

          {/* Status Toggle */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex gap-2">
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
          </div>

          {/* Conditional date fields */}
          {status === 'ordered' && (
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
            <div className="grid grid-cols-[2fr_1fr_0.5fr_0.75fr_0.5fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
              <div>Product</div>
              <div>Package</div>
              <div>Qty</div>
              <div>Size</div>
              <div>Unit</div>
              <div>Price</div>
              <div>Total</div>
              <div></div>
            </div>

            {/* Line Items */}
            {lines.map(line => {
              const product = getProductInfo(line.productId);
              return (
                <div key={line.id} className="grid grid-cols-[2fr_1fr_0.5fr_0.75fr_0.5fr_1fr_1fr_auto] gap-2 items-center">
                  <Select 
                    value={line.productId} 
                    onValueChange={val => {
                      const prod = products.find(p => p.id === val);
                      updateLine(line.id, { 
                        productId: val,
                        packageUnit: prod?.form === 'liquid' ? 'gal' : 'lbs',
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={line.packageType} 
                    onValueChange={val => updateLine(line.id, { packageType: val })}
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
                    onValueChange={val => updateLine(line.id, { packageUnit: val as 'gal' | 'lbs' })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gal">gal</SelectItem>
                      <SelectItem value="lbs">lbs</SelectItem>
                    </SelectContent>
                  </Select>

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
              );
            })}

            {lines.length === 0 && (
              <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                No items added. Click below to add a line item.
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={addLine}
              className="w-full"
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
