import React, { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Droplet, Weight, ChevronDown } from 'lucide-react';
import type { Application, Product, Crop, RateUnit, LiquidUnit, DryUnit, Vendor } from '@/types/farm';
import { formatNumber, formatCurrency, convertToGallons, convertToPounds } from '@/utils/farmUtils';
import { ACRES_PRESETS, getApplicationAcresPercentage } from '@/lib/cropCalculations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
interface EntryModePanelProps {
  application: Application | null;
  crop: Crop;
  products: Product[];
  vendors?: Vendor[];
  onSave: (app: Application) => void;
  onDelete: (appId: string) => void;
  onClose: () => void;
}

export const EntryModePanel: React.FC<EntryModePanelProps> = ({
  application,
  crop,
  products,
  vendors = [],
  onSave,
  onDelete,
  onClose,
}) => {
  const [productId, setProductId] = useState(application?.productId || products[0]?.id || '');
  const [rate, setRate] = useState(application?.rate || 0);
  const [rateUnit, setRateUnit] = useState<RateUnit>(application?.rateUnit || 'oz');
  const [acresPercentage, setAcresPercentage] = useState(() => 
    application ? getApplicationAcresPercentage(application, crop) : 100
  );
  const [role, setRole] = useState(application?.role || '');
  const [showCustomAcres, setShowCustomAcres] = useState(false);

  const product = products.find(p => p.id === productId);
  
  // Calculate live cost preview
  let costPerAcre = 0;
  if (product) {
    if (product.form === 'liquid') {
      const gallonsPerAcre = convertToGallons(rate, rateUnit as LiquidUnit);
      costPerAcre = gallonsPerAcre * product.price;
    } else {
      const poundsPerAcre = convertToPounds(rate, rateUnit as DryUnit);
      const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
      costPerAcre = poundsPerAcre * pricePerPound;
    }
  }

  const acresTreated = crop.totalAcres * (acresPercentage / 100);
  const totalCost = costPerAcre * acresTreated;

  // Available rate units based on product form
  const rateUnits = product?.form === 'liquid' 
    ? ['oz', 'qt', 'gal'] 
    : ['oz', 'lbs', 'g', 'ton'];

  useEffect(() => {
    // Reset rate unit if product form changes
    if (product) {
      const validUnits = product.form === 'liquid' ? ['oz', 'qt', 'gal'] : ['oz', 'lbs', 'g', 'ton'];
      if (!validUnits.includes(rateUnit)) {
        setRateUnit('oz');
      }
    }
  }, [productId, product, rateUnit]);

  // ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSave = () => {
    if (!application) return;
    
    const updated: Application = {
      ...application,
      productId,
      rate,
      rateUnit,
      acresPercentage,
      role: role.trim() || undefined,
    };
    onSave(updated);
    onClose();
  };

  const handlePresetClick = (value: number) => {
    if (value === -1) {
      setShowCustomAcres(true);
    } else {
      setAcresPercentage(value);
      setShowCustomAcres(false);
    }
  };

  if (!application) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-xl z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Edit Application</h3>
        <button
          onClick={onClose}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Product Select */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Product</label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="w-full bg-background border border-input">
              <SelectValue placeholder="Select a product">
                {product && (
                  <div className="flex items-center gap-2">
                    {product.form === 'liquid' ? (
                      <Droplet className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    ) : (
                      <Weight className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                    )}
                    <span className="truncate">{product.name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border shadow-lg z-[100]">
              <ScrollArea className="max-h-[300px]">
                {products.map(p => {
                  const vendor = vendors.find(v => v.id === p.vendorId);
                  return (
                    <SelectItem 
                      key={p.id} 
                      value={p.id}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 py-0.5">
                        {p.form === 'liquid' ? (
                          <Droplet className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        ) : (
                          <Weight className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                        )}
                        <div className="flex flex-col">
                          {vendor && (
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                              {vendor.name}
                            </span>
                          )}
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>

        {/* Rate */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Rate</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              min={0}
              step={0.1}
            />
            <Select value={rateUnit} onValueChange={(v) => setRateUnit(v as RateUnit)}>
              <SelectTrigger className="w-24 bg-background border border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-[100]">
                {rateUnits.map(u => (
                  <SelectItem key={u} value={u} className="cursor-pointer">{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Acres Percentage - Presets + Slider */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Acres</label>
          
          {/* Preset buttons */}
          <div className="flex gap-2">
            {ACRES_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (preset.value === acresPercentage && !showCustomAcres) || 
                  (preset.value === -1 && showCustomAcres)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              value={acresPercentage}
              onChange={(e) => {
                setAcresPercentage(Number(e.target.value));
                setShowCustomAcres(true);
              }}
              min={0}
              max={100}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {formatNumber(acresPercentage, 0)}% = {formatNumber(acresTreated, 0)} acres
              </span>
            </div>
          </div>
        </div>

        {/* Role (optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Role <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g., Biology / Carbon, Stress mitigation"
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Live Cost Preview */}
        <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium text-foreground">Cost Preview</h4>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Per treated acre:</span>
            <span className="font-medium text-primary">{formatCurrency(costPerAcre)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total ({formatNumber(acresTreated, 0)} ac):</span>
            <span className="font-semibold text-foreground">{formatCurrency(totalCost)}</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between">
        <button
          onClick={() => {
            onDelete(application.id);
            onClose();
          }}
          className="flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg text-sm transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
