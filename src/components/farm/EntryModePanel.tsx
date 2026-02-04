import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Trash2, Droplet, Weight, ChevronDown, Plus } from 'lucide-react';
import type { Application, Product, Crop, RateUnit, LiquidUnit, DryUnit, Vendor, TierLabel } from '@/types/farm';
import type { ProductMaster } from '@/types';
import { formatNumber, formatCurrency, convertToGallons, convertToPounds } from '@/utils/farmUtils';
import { ACRES_PRESETS, getApplicationAcresPercentage, calculateAutoTier, getTierDisplayLabel } from '@/lib/cropCalculations';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectSeparator } from '@/components/ui/select';
import { AddProductModal } from './AddProductModal';

interface EntryModePanelProps {
  application: Application | null;
  crop: Crop;
  products: Product[];
  vendors?: Vendor[];
  onSave: (app: Application) => void;
  onDelete: (appId: string) => void;
  onClose: () => void;
  onAddProduct?: (product: ProductMaster) => void;
}

export const EntryModePanel: React.FC<EntryModePanelProps> = ({
  application,
  crop,
  products,
  vendors = [],
  onSave,
  onDelete,
  onClose,
  onAddProduct,
}) => {
  const [productId, setProductId] = useState(application?.productId || products[0]?.id || '');
  const [rate, setRate] = useState(application?.rate || 0);
  const [rateUnit, setRateUnit] = useState<RateUnit>(application?.rateUnit || 'oz');
  const [acresPercentage, setAcresPercentage] = useState(() => 
    application ? getApplicationAcresPercentage(application, crop) : 100
  );
  const [role, setRole] = useState(application?.role || '');
  const [showCustomAcres, setShowCustomAcres] = useState(false);
  const [tierOverride, setTierOverride] = useState<TierLabel | undefined>(application?.tierOverride);
  const [showTierOverride, setShowTierOverride] = useState(!!application?.tierOverride);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [localProducts, setLocalProducts] = useState<Product[]>(products);

  // Sync local products when parent products change
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  const product = localProducts.find(p => p.id === productId);

  // Group products by vendor, sorted alphabetically by vendor name
  const productsByVendor = useMemo(() => {
    // Create a map of vendorId -> { vendor, products }
    const vendorMap = new Map<string, { vendor: Vendor | undefined; products: Product[] }>();
    
    localProducts.forEach(p => {
      const vendor = vendors.find(v => v.id === p.vendorId);
      const vendorId = p.vendorId || 'unknown';
      
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, { vendor, products: [] });
      }
      vendorMap.get(vendorId)!.products.push(p);
    });
    
    // Convert to array and sort by vendor name alphabetically
    return Array.from(vendorMap.values())
      .sort((a, b) => {
        const nameA = a.vendor?.name || 'ZZZ'; // Unknown vendors go last
        const nameB = b.vendor?.name || 'ZZZ';
        return nameA.localeCompare(nameB);
      })
      .map(group => ({
        ...group,
        // Sort products within each vendor alphabetically
        products: group.products.slice().sort((a, b) => a.name.localeCompare(b.name))
      }));
  }, [products, vendors]);
  
  // Calculate live cost preview
  let costPerAcre = 0;
  if (product) {
    // Handle container-based pricing (e.g., $900/jug with 1800g per jug)
    if (product.containerSize && product.containerUnit && ['jug', 'bag', 'case', 'tote'].includes(product.priceUnit || '')) {
      const containerPrice = product.price;
      const containerQuantity = product.containerSize;
      
      // Calculate price per gram
      let pricePerGram = 0;
      if (product.containerUnit === 'g') {
        pricePerGram = containerPrice / containerQuantity;
      } else if (product.containerUnit === 'lbs') {
        pricePerGram = containerPrice / (containerQuantity * 453.592);
      } else if (product.containerUnit === 'oz') {
        pricePerGram = containerPrice / (containerQuantity * 28.3495);
      }
      
      // If rate is in grams, use directly
      if (rateUnit === 'g') {
        costPerAcre = rate * pricePerGram;
      } else {
        // Convert to pounds and calculate
        const pricePerPound = pricePerGram * 453.592;
        const poundsPerAcre = convertToPounds(rate, rateUnit as DryUnit);
        costPerAcre = poundsPerAcre * pricePerPound;
      }
    } else if (product.priceUnit === 'g') {
      // Handle per-gram pricing
      if (rateUnit === 'g') {
        costPerAcre = rate * product.price;
      } else {
        const poundsPerAcre = convertToPounds(rate, rateUnit as DryUnit);
        const gramsPerAcre = poundsPerAcre * 453.592;
        costPerAcre = gramsPerAcre * product.price;
      }
    } else if (product.form === 'liquid') {
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
  const wholeFieldCostPerAcre = costPerAcre * (acresPercentage / 100);

  // Auto-tier calculation
  const tierAuto = calculateAutoTier(acresPercentage);
  const tierFinal = tierOverride ?? tierAuto;
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
      tierAuto,
      tierOverride,
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

  const handleProductChange = (value: string) => {
    if (value === '__add_new__') {
      setShowAddProductModal(true);
      return;
    }
    setProductId(value);
  };

  const handleNewProductSave = (newProductMaster: ProductMaster) => {
    // Notify parent to persist the new product
    onAddProduct?.(newProductMaster);
    
    // Create a temporary Product from ProductMaster for immediate use
    const newProduct: Product = {
      id: newProductMaster.id,
      name: newProductMaster.name,
      form: newProductMaster.form,
      price: newProductMaster.estimatedPrice || 0,
      priceUnit: (newProductMaster.estimatedPriceUnit || 
                 (newProductMaster.form === 'liquid' ? 'gal' : 'lbs')) as Product['priceUnit'],
      vendorId: '', // No vendor yet
    };
    
    // Add to local products list and select it
    setLocalProducts(prev => [...prev, newProduct]);
    setProductId(newProductMaster.id);
    setShowAddProductModal(false);
  };

  if (!application) return null;

  return (
    <>
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
        {/* Product Select - Grouped by Vendor */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Product</label>
          <Select value={productId} onValueChange={handleProductChange}>
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
            <SelectContent className="bg-popover border border-border shadow-lg z-[100] max-h-[400px]">
              {/* Add New Product option - always first */}
              {onAddProduct && (
                <>
                  <SelectItem value="__add_new__" className="cursor-pointer text-primary font-medium">
                    <div className="flex items-center gap-2 py-0.5">
                      <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Add New Product...</span>
                    </div>
                  </SelectItem>
                  <SelectSeparator />
                </>
              )}
              
              {productsByVendor.map(({ vendor, products: vendorProducts }) => (
                <SelectGroup key={vendor?.id || 'unknown'}>
                  <SelectLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-1.5 -mx-1 sticky top-0">
                    {vendor?.name || 'Unknown Vendor'}
                  </SelectLabel>
                  {vendorProducts.map(p => (
                    <SelectItem 
                      key={p.id} 
                      value={p.id}
                      className="cursor-pointer pl-4"
                    >
                      <div className="flex items-center gap-2 py-0.5">
                        {p.form === 'liquid' ? (
                          <Droplet className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                        ) : (
                          <Weight className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                        )}
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
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
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                tierFinal === 'core' ? 'bg-primary/10 text-primary' :
                tierFinal === 'selective' ? 'bg-amber-500/10 text-amber-600' :
                'bg-muted text-muted-foreground'
              }`}>
                {getTierDisplayLabel(tierFinal)}
              </span>
            </div>

            {/* Tier Override */}
            {showTierOverride ? (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Override:</span>
                <select
                  value={tierOverride || ''}
                  onChange={(e) => setTierOverride(e.target.value as TierLabel || undefined)}
                  className="flex-1 px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Auto ({getTierDisplayLabel(tierAuto)})</option>
                  <option value="core">Core</option>
                  <option value="selective">Selective</option>
                  <option value="trial">Trial</option>
                </select>
                <button
                  onClick={() => { setShowTierOverride(false); setTierOverride(undefined); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTierOverride(true)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Override tier
              </button>
            )}
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
            <span className="text-muted-foreground flex items-center gap-1">
              Whole-field equivalent:
              <span className="text-xs text-muted-foreground/70" title="Treated cost × % acres">(?)</span>
            </span>
            <span className="font-medium text-foreground">{formatCurrency(wholeFieldCostPerAcre)}/ac</span>
          </div>
          <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
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

      {/* Add Product Modal */}
      <AddProductModal
        open={showAddProductModal}
        onOpenChange={setShowAddProductModal}
        onSave={handleNewProductSave}
      />
    </>
  );
};
