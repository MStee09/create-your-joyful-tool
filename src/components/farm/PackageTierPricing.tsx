import React, { useState } from 'react';
import {
  Package,
  Plus,
  Trash2,
  TrendingDown,
  Edit,
  Check,
  X,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Types
interface PackageTier {
  id: string;
  packageType: string;
  packageSize: number;
  unit: string;
  pricePerUnit: number;
  minQuantity?: number;
  isDefault?: boolean;
}

interface Product {
  id: string;
  name: string;
  vendorName: string;
  unit: string;
  productType: 'specialty' | 'commodity';
  packageTiers: PackageTier[];
}

// Mock product with package tiers
const mockProduct: Product = {
  id: 'p1',
  name: 'Humical',
  vendorName: 'BW Fusion',
  unit: 'gal',
  productType: 'specialty',
  packageTiers: [
    { id: 'pt1', packageType: '2.5 gal jug', packageSize: 2.5, unit: 'gal', pricePerUnit: 48.00, isDefault: true },
    { id: 'pt2', packageType: '30 gal drum', packageSize: 30, unit: 'gal', pricePerUnit: 45.00 },
    { id: 'pt3', packageType: '275 gal tote', packageSize: 275, unit: 'gal', pricePerUnit: 42.00 },
    { id: 'pt4', packageType: 'Bulk (tanker)', packageSize: 0, unit: 'gal', pricePerUnit: 38.00, minQuantity: 500 },
  ],
};

interface PackageTierEditorProps {
  product: Product;
  onChange: (tiers: PackageTier[]) => void;
}

export const PackageTierEditor: React.FC<PackageTierEditorProps> = ({
  product,
  onChange,
}) => {
  const [tiers, setTiers] = useState<PackageTier[]>(product.packageTiers);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New tier form state
  const [newPackageType, setNewPackageType] = useState('');
  const [newPackageSize, setNewPackageSize] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newMinQuantity, setNewMinQuantity] = useState('');

  // Calculate savings compared to highest price tier
  const maxPrice = Math.max(...tiers.map(t => t.pricePerUnit));
  const getSavings = (price: number) => {
    if (price >= maxPrice) return 0;
    return ((maxPrice - price) / maxPrice) * 100;
  };

  // Update tier
  const updateTier = (id: string, updates: Partial<PackageTier>) => {
    const updated = tiers.map(t => t.id === id ? { ...t, ...updates } : t);
    setTiers(updated);
    onChange(updated);
  };

  // Delete tier
  const deleteTier = (id: string) => {
    const updated = tiers.filter(t => t.id !== id);
    setTiers(updated);
    onChange(updated);
  };

  // Add tier
  const addTier = () => {
    const newTier: PackageTier = {
      id: `pt-${Date.now()}`,
      packageType: newPackageType,
      packageSize: parseFloat(newPackageSize) || 0,
      unit: product.unit,
      pricePerUnit: parseFloat(newPrice) || 0,
      minQuantity: newMinQuantity ? parseInt(newMinQuantity) : undefined,
    };
    const updated = [...tiers, newTier].sort((a, b) => b.pricePerUnit - a.pricePerUnit);
    setTiers(updated);
    onChange(updated);
    
    // Reset form
    setNewPackageType('');
    setNewPackageSize('');
    setNewPrice('');
    setNewMinQuantity('');
    setShowAddForm(false);
  };

  // Set default tier
  const setDefaultTier = (id: string) => {
    const updated = tiers.map(t => ({ ...t, isDefault: t.id === id }));
    setTiers(updated);
    onChange(updated);
  };

  // Sort tiers by price (highest to lowest)
  const sortedTiers = [...tiers].sort((a, b) => b.pricePerUnit - a.pricePerUnit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Package Pricing</h3>
          <p className="text-sm text-muted-foreground">
            Different prices for different package sizes
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Package Tier
        </button>
      </div>

      {/* Info Box */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex gap-2 text-sm text-blue-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Volume discounts:</strong> Larger packages typically have lower per-unit pricing. 
            When you order, you'll see potential savings by choosing larger package sizes.
          </div>
        </div>
      </div>

      {/* Tiers List */}
      <div className="space-y-2">
        {sortedTiers.map((tier, index) => {
          const savings = getSavings(tier.pricePerUnit);
          const isEditing = editingTierId === tier.id;
          const isLowestPrice = index === sortedTiers.length - 1;

          return (
            <div
              key={tier.id}
              className={`p-4 rounded-xl border transition-colors ${
                tier.isDefault
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-card border-border'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Package Icon */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  isLowestPrice 
                    ? 'bg-emerald-100' 
                    : 'bg-muted'
                }`}>
                  <Package className={`w-6 h-6 ${
                    isLowestPrice 
                      ? 'text-emerald-600' 
                      : 'text-muted-foreground'
                  }`} />
                </div>

                {/* Package Info */}
                <div className="flex-1">
                  {isEditing ? (
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={tier.packageType}
                        onChange={(e) => updateTier(tier.id, { packageType: e.target.value })}
                        className="px-2 py-1 border border-border rounded text-sm bg-background"
                        placeholder="Package name"
                      />
                      <input
                        type="number"
                        value={tier.packageSize}
                        onChange={(e) => updateTier(tier.id, { packageSize: parseFloat(e.target.value) || 0 })}
                        className="px-2 py-1 border border-border rounded text-sm bg-background"
                        placeholder="Size"
                      />
                      <input
                        type="number"
                        value={tier.pricePerUnit}
                        onChange={(e) => updateTier(tier.id, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                        className="px-2 py-1 border border-border rounded text-sm bg-background"
                        placeholder="Price"
                        step="0.01"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {tier.packageType}
                        </span>
                        {tier.isDefault && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                            Default
                          </span>
                        )}
                        {isLowestPrice && !tier.isDefault && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            Best Value
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {tier.packageSize > 0 ? `${tier.packageSize} ${tier.unit}` : 'Variable quantity'}
                        {tier.minQuantity && ` · Min ${tier.minQuantity} ${tier.unit}`}
                      </div>
                    </>
                  )}
                </div>

                {/* Price */}
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">
                    ${tier.pricePerUnit.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">/{tier.unit}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex items-center justify-end gap-1 text-sm text-emerald-600">
                      <TrendingDown className="w-3 h-3" />
                      Save {savings.toFixed(0)}%
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setEditingTierId(null)}
                        className="p-2 hover:bg-muted rounded-lg"
                      >
                        <Check className="w-4 h-4 text-emerald-500" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingTierId(null);
                        }}
                        className="p-2 hover:bg-muted rounded-lg"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </>
                  ) : (
                    <>
                      {!tier.isDefault && (
                        <button
                          onClick={() => setDefaultTier(tier.id)}
                          title="Set as default"
                          className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingTierId(tier.id)}
                        className="p-2 hover:bg-muted rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {tiers.length > 1 && (
                        <button
                          onClick={() => deleteTier(tier.id)}
                          className="p-2 hover:bg-muted rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Tier Form */}
      {showAddForm && (
        <div className="p-4 bg-muted rounded-xl border-2 border-dashed border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">Add Package Tier</h4>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Package Type</label>
              <input
                type="text"
                value={newPackageType}
                onChange={(e) => setNewPackageType(e.target.value)}
                placeholder="e.g., 55 gal drum"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Size ({product.unit})</label>
              <input
                type="number"
                value={newPackageSize}
                onChange={(e) => setNewPackageSize(e.target.value)}
                placeholder="55"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Price per {product.unit}</label>
              <div className="flex">
                <span className="px-2 py-2 bg-muted border border-r-0 border-border rounded-l-lg text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="43.00"
                  step="0.01"
                  className="flex-1 w-full px-3 py-2 border border-border rounded-r-lg bg-background text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Min Qty (optional)</label>
              <input
                type="number"
                value={newMinQuantity}
                onChange={(e) => setNewMinQuantity(e.target.value)}
                placeholder="500"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-sm text-muted-foreground"
            >
              Cancel
            </button>
            <button
              onClick={addTier}
              disabled={!newPackageType || !newPrice}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground text-white rounded-lg text-sm font-medium"
            >
              Add Tier
            </button>
          </div>
        </div>
      )}

      {/* Savings Calculator */}
      {tiers.length > 1 && (
        <SavingsCalculator tiers={sortedTiers} unit={product.unit} />
      )}
    </div>
  );
};

// Savings Calculator Component
const SavingsCalculator: React.FC<{ tiers: PackageTier[]; unit: string }> = ({ tiers, unit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [neededQuantity, setNeededQuantity] = useState<string>('100');

  const quantity = parseFloat(neededQuantity) || 0;
  
  // Calculate cost for each tier
  const tierCosts = tiers.map(tier => {
    if (tier.minQuantity && quantity < tier.minQuantity) {
      return { tier, packages: 0, totalQty: 0, cost: Infinity, eligible: false };
    }
    
    let packages = 0;
    let totalQty = 0;
    
    if (tier.packageSize > 0) {
      packages = Math.ceil(quantity / tier.packageSize);
      totalQty = packages * tier.packageSize;
    } else {
      // Bulk - exact quantity
      packages = 1;
      totalQty = quantity;
    }
    
    const cost = totalQty * tier.pricePerUnit;
    return { tier, packages, totalQty, cost, eligible: true };
  }).filter(tc => tc.eligible);

  const bestOption = tierCosts.reduce((best, current) => 
    current.cost < best.cost ? current : best
  , tierCosts[0]);

  const worstOption = tierCosts.reduce((worst, current) =>
    current.cost > worst.cost ? current : worst
  , tierCosts[0]);

  const maxSavings = worstOption && bestOption ? worstOption.cost - bestOption.cost : 0;

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-emerald-600" />
          <span className="font-medium text-foreground">Savings Calculator</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              How much do you need?
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={neededQuantity}
                onChange={(e) => setNeededQuantity(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
              />
              <span className="px-4 py-2 bg-muted rounded-lg text-muted-foreground">
                {unit}
              </span>
            </div>
          </div>

          {quantity > 0 && tierCosts.length > 0 && (
            <div className="space-y-2">
              {tierCosts.map(({ tier, packages, totalQty, cost }) => {
                const isBest = cost === bestOption?.cost;
                return (
                  <div
                    key={tier.id}
                    className={`p-3 rounded-lg ${
                      isBest 
                        ? 'bg-emerald-100 border border-emerald-300' 
                        : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {tier.packageType}
                          {isBest && (
                            <span className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">
                              Best Value
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {tier.packageSize > 0 
                            ? `${packages} × ${tier.packageSize} ${unit} = ${totalQty} ${unit}`
                            : `${totalQty} ${unit} bulk`
                          }
                          {totalQty > quantity && (
                            <span className="text-amber-600 ml-1">
                              (+{(totalQty - quantity).toFixed(1)} {unit} extra)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-foreground">
                          ${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {!isBest && bestOption && (
                          <div className="text-sm text-red-500">
                            +${(cost - bestOption.cost).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {maxSavings > 0 && (
                <div className="text-center p-3 bg-emerald-100 rounded-lg">
                  <span className="text-emerald-800">
                    💰 Save up to <strong>${maxSavings.toFixed(2)}</strong> by choosing {bestOption?.tier.packageType}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Demo/Preview Component
export const PackageTierPreview: React.FC = () => {
  const [product, setProduct] = useState(mockProduct);

  const handleChange = (tiers: PackageTier[]) => {
    setProduct({ ...product, packageTiers: tiers });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
          <p className="text-muted-foreground">{product.vendorName}</p>
        </div>
        
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <PackageTierEditor product={product} onChange={handleChange} />
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex gap-2 text-sm text-blue-800">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>How it works:</strong> When placing an order, you'll select the package type. 
              FarmCalc will calculate the best option based on your quantity needed and show potential savings.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageTierEditor;
