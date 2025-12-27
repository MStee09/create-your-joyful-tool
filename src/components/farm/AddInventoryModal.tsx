import React, { useState, useMemo, useEffect } from 'react';
import { X, ArrowLeft, Package, ClipboardList, Calendar, FileText, TrendingUp, Check, AlertTriangle } from 'lucide-react';
import type { Product, Vendor } from '@/types/farm';
import { formatNumber, generateId } from '@/utils/farmUtils';

// New types for purchase tracking
export interface Purchase {
  id: string;
  date: string;
  vendorId: string;
  seasonYear: number;
  status: 'ordered' | 'received' | 'partial';
  invoiceNumber?: string;
  notes?: string;
  lineItems: PurchaseLineItem[];
  totalCost: number;
}

export interface PurchaseLineItem {
  id: string;
  productId: string;
  quantity: number;
  unit: string;
  packageType?: string;
  packageQuantity?: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InventoryTransaction {
  id: string;
  date: string;
  productId: string;
  type: 'purchase' | 'application' | 'adjustment' | 'return' | 'carryover';
  quantity: number;
  unit: string;
  referenceId?: string;
  referenceType?: 'purchase' | 'application';
  seasonYear: number;
  notes?: string;
  unitCost?: number;
}

export interface PriceHistory {
  productId: string;
  vendorId: string;
  date: string;
  unitPrice: number;
  unit: string;
  seasonYear: number;
}

interface ProductUsage {
  cropName: string;
  timingName: string;
}

interface AddInventoryModalProps {
  product: Product;
  vendor: Vendor | null;
  vendors: Vendor[];
  onHand: number;
  planNeeds: number;
  unit: string;
  usedIn: ProductUsage[];
  packageOptions: { label: string; size: number; unit: string }[];
  priceHistory: PriceHistory[];
  currentSeasonYear: number;
  onClose: () => void;
  onAddInventory: (data: {
    quantity: number;
    unit: string;
    packageType?: string;
    packageQuantity?: number;
    reason?: string;
    note?: string;
  }) => void;
  onCreatePurchase: (data: {
    quantity: number;
    unit: string;
    packageType?: string;
    packageQuantity?: number;
    vendorId: string;
    unitPrice: number;
    date: string;
    invoiceNumber?: string;
    seasonYear: number;
  }) => void;
}

export const AddInventoryModal: React.FC<AddInventoryModalProps> = ({
  product,
  vendor,
  vendors,
  onHand,
  planNeeds,
  unit,
  usedIn,
  packageOptions,
  priceHistory,
  currentSeasonYear,
  onClose,
  onAddInventory,
  onCreatePurchase,
}) => {
  // Mode: purchase vs adjustment
  const [mode, setMode] = useState<'purchase' | 'adjustment'>('purchase');
  
  // Common fields
  const [selectedPackage, setSelectedPackage] = useState(packageOptions[0]?.label || '');
  const [packageQuantity, setPackageQuantity] = useState(1);
  
  // Purchase-specific fields
  const [selectedVendorId, setSelectedVendorId] = useState(vendor?.id || '');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [priceInputMode, setPriceInputMode] = useState<'perUnit' | 'perPackage'>('perUnit');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [seasonYear, setSeasonYear] = useState(currentSeasonYear);
  
  // Adjustment-specific fields
  const [adjustmentReason, setAdjustmentReason] = useState<'carryover' | 'transfer' | 'correction' | 'sample'>('carryover');
  const [adjustmentNote, setAdjustmentNote] = useState('');

  // Calculate total quantity from packages
  const selectedPackageOption = packageOptions.find(p => p.label === selectedPackage);
  const totalQuantity = selectedPackageOption 
    ? packageQuantity * selectedPackageOption.size 
    : packageQuantity;

  // Get last price for this product
  const lastPrice = useMemo(() => {
    const productPrices = priceHistory
      .filter(p => p.productId === product.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return productPrices[0] || null;
  }, [priceHistory, product.id]);

  // Pre-fill price from history
  useEffect(() => {
    if (lastPrice && unitPrice === '') {
      setUnitPrice(lastPrice.unitPrice);
    }
  }, [lastPrice]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    if (unitPrice === '') return 0;
    if (priceInputMode === 'perUnit') {
      return totalQuantity * unitPrice;
    } else {
      return packageQuantity * unitPrice;
    }
  }, [unitPrice, totalQuantity, packageQuantity, priceInputMode]);

  // Calculate effective per-unit price
  const effectiveUnitPrice = useMemo(() => {
    if (unitPrice === '') return 0;
    if (priceInputMode === 'perUnit') {
      return unitPrice;
    } else {
      return selectedPackageOption ? unitPrice / selectedPackageOption.size : unitPrice;
    }
  }, [unitPrice, priceInputMode, selectedPackageOption]);

  // Check if this covers the shortage
  const shortage = planNeeds - onHand;
  const coversNeed = totalQuantity >= shortage;
  const surplus = totalQuantity - shortage;

  const handleSubmit = () => {
    if (mode === 'purchase') {
      if (!selectedVendorId || unitPrice === '') return;
      
      onCreatePurchase({
        quantity: totalQuantity,
        unit,
        packageType: selectedPackage,
        packageQuantity,
        vendorId: selectedVendorId,
        unitPrice: effectiveUnitPrice,
        date: purchaseDate,
        invoiceNumber: invoiceNumber || undefined,
        seasonYear,
      });
    } else {
      onAddInventory({
        quantity: totalQuantity,
        unit,
        packageType: selectedPackage,
        packageQuantity,
        reason: adjustmentReason,
        note: adjustmentNote || undefined,
      });
    }
    onClose();
  };

  const isValid = mode === 'purchase' 
    ? selectedVendorId && unitPrice !== '' && packageQuantity > 0
    : packageQuantity > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-lg font-semibold">Add Inventory</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Product Info Card */}
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {vendor?.name || 'Unknown Vendor'}
            </p>
            <h3 className="text-xl font-bold mb-3">{product.name}</h3>
            
            <div className="border-t border-border pt-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">On Hand</p>
                  <p className="font-semibold">{formatNumber(onHand, 1)} {unit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Plan Needs</p>
                  <p className="font-semibold">{formatNumber(planNeeds, 1)} {unit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  {shortage > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive text-sm font-medium rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      Short
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 text-sm font-medium rounded-full">
                      <Check className="w-3 h-3" />
                      OK
                    </span>
                  )}
                </div>
              </div>
            </div>

            {usedIn.length > 0 && (
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-xs text-muted-foreground mb-1">Used In</p>
                <p className="text-sm">
                  {usedIn.map(u => `${u.cropName} → ${u.timingName}`).join(', ')}
                </p>
              </div>
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
          <div>
            <label className="block text-sm font-medium mb-2">
              Package Type
            </label>
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {packageOptions.map(pkg => (
                <option key={pkg.label} value={pkg.label}>
                  {pkg.label} ({pkg.size} {pkg.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={packageQuantity}
                onChange={(e) => setPackageQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                className="w-24 px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-muted-foreground">
                {selectedPackage ? `${selectedPackage.toLowerCase()}s` : 'containers'}
              </span>
              <span className="text-muted-foreground">=</span>
              <span className="font-semibold">
                {formatNumber(totalQuantity, 1)} {unit} total
              </span>
            </div>
            
            {/* Coverage indicator */}
            {shortage > 0 && (
              <div className={`mt-2 text-sm ${coversNeed ? 'text-green-600' : 'text-amber-600'}`}>
                {coversNeed ? (
                  <>✓ Covers plan need ({formatNumber(shortage, 1)} {unit}){surplus > 0 && ` + ${formatNumber(surplus, 1)} ${unit} extra`}</>
                ) : (
                  <>⚠ Still short {formatNumber(shortage - totalQuantity, 1)} {unit} after this</>
                )}
              </div>
            )}
          </div>

          {/* Purchase-specific fields */}
          {mode === 'purchase' && (
            <>
              <div className="border-t border-border pt-5">
                <h4 className="text-sm font-semibold mb-4 uppercase tracking-wide">
                  Purchase Details
                </h4>

                {/* Vendor */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Vendor
                  </label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select vendor...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} {vendor?.id === v.id ? '(default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Unit Price
                  </label>
                  
                  {/* Last price hint */}
                  {lastPrice && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      <span>Last purchased at ${formatNumber(lastPrice.unitPrice, 2)}/{lastPrice.unit}</span>
                      {unitPrice === '' && (
                        <button
                          onClick={() => setUnitPrice(lastPrice.unitPrice)}
                          className="text-primary hover:underline"
                        >
                          Use this price
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        type="number"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        step="0.01"
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <select
                      value={priceInputMode}
                      onChange={(e) => setPriceInputMode(e.target.value as 'perUnit' | 'perPackage')}
                      className="px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="perUnit">/{unit}</option>
                      <option value="perPackage">/{selectedPackage || 'pkg'}</option>
                    </select>
                  </div>
                  
                  {/* Total calculation */}
                  {unitPrice !== '' && (
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {priceInputMode === 'perPackage' && `($${formatNumber(effectiveUnitPrice, 2)}/${unit})`}
                      </span>
                      <span className="font-semibold">
                        Total: ${formatNumber(totalCost, 2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Date and Invoice */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date
                    </label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <FileText className="w-4 h-4 inline mr-1" />
                      Invoice # <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="INV-2024-..."
                      className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Season */}
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Season
                  </label>
                  <select
                    value={seasonYear}
                    onChange={(e) => setSeasonYear(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value={currentSeasonYear - 1}>{currentSeasonYear - 1}</option>
                    <option value={currentSeasonYear}>{currentSeasonYear}</option>
                    <option value={currentSeasonYear + 1}>{currentSeasonYear + 1}</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Adjustment-specific fields */}
          {mode === 'adjustment' && (
            <div className="border-t border-border pt-5">
              <h4 className="text-sm font-semibold mb-4 uppercase tracking-wide">
                Adjustment Details
              </h4>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Reason
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value as typeof adjustmentReason)}
                  className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="carryover">Carryover from last season</option>
                  <option value="transfer">Transfer from another location</option>
                  <option value="correction">Inventory count correction</option>
                  <option value="sample">Vendor sample / gift</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Note <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  placeholder="Add a note about this adjustment..."
                  rows={2}
                  className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-input rounded-xl font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors ${
                isValid
                  ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Package className="w-4 h-4" />
              {mode === 'purchase' ? (
                <>
                  Purchase {packageQuantity} {selectedPackage || 'pkg'}
                  {unitPrice !== '' && <span className="opacity-80">(${formatNumber(totalCost, 2)})</span>}
                </>
              ) : (
                <>Add {packageQuantity} {selectedPackage || 'container'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddInventoryModal;
