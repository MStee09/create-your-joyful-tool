import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/calculations';
import type { PriceRecord, NewPriceRecord } from '@/types/priceRecord';
import type { Vendor, ProductMaster } from '@/types';

interface LogQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: NewPriceRecord) => Promise<PriceRecord | null>;
  products: ProductMaster[];
  vendors: Vendor[];
  currentSeasonYear: number;
  preselectedProductId?: string;
  preselectedVendorId?: string;
}

const PACKAGE_TYPES = ['Tote', 'Twin-pack', 'Jug', 'Bag', 'Drum', 'Bulk'];
const RECENT_YEARS = [2026, 2025, 2024, 2023];

export const LogQuoteModal: React.FC<LogQuoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  products,
  vendors,
  currentSeasonYear,
  preselectedProductId,
  preselectedVendorId,
}) => {
  const [productId, setProductId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [unit, setUnit] = useState<'gal' | 'lbs' | 'ton'>('gal');
  const [packageType, setPackageType] = useState<string>('');
  const [packageSize, setPackageSize] = useState<number | undefined>();
  const [packageUnit, setPackageUnit] = useState<'gal' | 'lbs'>('gal');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [seasonYear, setSeasonYear] = useState(currentSeasonYear);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      setProductId(preselectedProductId || '');
      setVendorId(preselectedVendorId || '');
      setPrice(0);
      setUnit('gal');
      setPackageType('');
      setPackageSize(undefined);
      setPackageUnit('gal');
      setQuoteDate(new Date().toISOString().split('T')[0]);
      setSeasonYear(currentSeasonYear);
      setNotes('');
    }
  }, [isOpen, preselectedProductId, preselectedVendorId, currentSeasonYear]);

  // Auto-set unit based on selected product
  useEffect(() => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const defaultUnit: 'gal' | 'lbs' = product.form === 'liquid' ? 'gal' : 'lbs';
      setUnit(defaultUnit);
      setPackageUnit(defaultUnit);
    }
  }, [productId, products]);

  const calculateNormalizedPrice = (): number => {
    if (packageSize && packageSize > 0) {
      return price / packageSize;
    }
    return price;
  };

  const isValid = productId && vendorId && price > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);

    try {
      const normalizedPrice = calculateNormalizedPrice();

      const record: NewPriceRecord = {
        productId,
        vendorId,
        price,
        unit,
        normalizedPrice,
        packageType: packageType && packageType !== 'none' ? packageType : undefined,
        packageSize: packageSize || undefined,
        packageUnit: packageSize ? packageUnit : undefined,
        date: quoteDate,
        seasonYear,
        type: 'quote',
        notes: notes || undefined,
      };

      const result = await onSave(record);
      if (result) {
        toast.success('Quote logged successfully');
        onClose();
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('Failed to save quote');
    } finally {
      setSaving(false);
    }
  };

  const selectedProduct = products.find(p => p.id === productId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Log Price Quote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product */}
          <div className="space-y-2">
            <Label>Product *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor */}
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

          {/* Price and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price || ''}
                  onChange={e => setPrice(Number(e.target.value) || 0)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Per</Label>
              <Select value={unit} onValueChange={val => setUnit(val as 'gal' | 'lbs' | 'ton')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gal">gallon</SelectItem>
                  <SelectItem value="lbs">pound</SelectItem>
                  <SelectItem value="ton">ton</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Package Info (Optional) */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <p className="text-sm text-muted-foreground">Optional: Package details for price normalization</p>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Package Type</Label>
                <Select value={packageType} onValueChange={setPackageType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {PACKAGE_TYPES.map(pt => (
                      <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Package Size</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={packageSize || ''}
                  onChange={e => setPackageSize(Number(e.target.value) || undefined)}
                  placeholder="e.g., 275"
                />
              </div>
              <div className="space-y-2">
                <Label>Size Unit</Label>
                <Select value={packageUnit} onValueChange={val => setPackageUnit(val as 'gal' | 'lbs')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gal">gal</SelectItem>
                    <SelectItem value="lbs">lbs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {packageSize && packageSize > 0 && (
              <p className="text-sm text-muted-foreground">
                Normalized: <span className="font-medium text-foreground">
                  {formatCurrency(calculateNormalizedPrice())}/{packageUnit}
                </span>
              </p>
            )}
          </div>

          {/* Date and Season */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quote Date</Label>
              <Input
                type="date"
                value={quoteDate}
                onChange={e => setQuoteDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Season Year</Label>
              <Select value={String(seasonYear)} onValueChange={val => setSeasonYear(Number(val))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECENT_YEARS.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              type="text"
              placeholder="e.g., Good through Feb 28, Cash price"
              value={notes}
              onChange={e => setNotes(e.target.value)}
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
            {saving ? 'Saving...' : 'Save Quote'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
