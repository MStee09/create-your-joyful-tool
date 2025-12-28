import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Package,
  Droplets,
  MoreVertical,
  Edit,
  Trash2,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
import type { InventoryItem, Product, Vendor, Season } from '@/types/farm';
import { formatCurrency, generateId } from '@/utils/farmUtils';
import { ProductSelectorModal, type ProductWithContext } from './ProductSelectorModal';
import { AddInventoryModal } from './AddInventoryModal';
import { formatInventoryDisplay, getDefaultPackagingOptions } from '@/lib/packagingUtils';

interface InventoryViewProps {
  inventory: InventoryItem[];
  products: Product[];
  vendors?: Vendor[];
  currentSeason?: Season | null;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  products,
  vendors = [],
  currentSeason = null,
  onUpdateInventory,
}) => {
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productContext, setProductContext] = useState<ProductWithContext | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'dry' | 'liquid'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'quantity'>('name');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const handleSelectProduct = (product: Product, context: ProductWithContext) => {
    setSelectedProduct(product);
    setProductContext(context);
    setShowProductSelector(false);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setSelectedProduct(null);
    setProductContext(null);
    setEditingItem(null);
  };

  const handleAddInventory = (data: {
    quantity: number;
    unit: string;
    packageType?: string;
    packageQuantity?: number;
    reason?: string;
    note?: string;
  }) => {
    if (!selectedProduct) return;

    const item: InventoryItem = {
      id: generateId(),
      productId: selectedProduct.id,
      quantity: data.quantity,
      unit: data.unit as 'gal' | 'lbs',
      packagingName: data.packageType,
      packagingSize: data.packageQuantity ? data.quantity / data.packageQuantity : undefined,
      containerCount: data.packageQuantity,
    };

    const existing = inventory.find(
      (i) =>
        i.productId === item.productId &&
        i.packagingName === item.packagingName &&
        i.packagingSize === item.packagingSize
    );

    if (existing) {
      onUpdateInventory(
        inventory.map((i) =>
          i.id === existing.id
            ? {
                ...i,
                quantity: i.quantity + item.quantity,
                containerCount: (i.containerCount || 0) + (item.containerCount || 0),
              }
            : i
        )
      );
    } else {
      onUpdateInventory([...inventory, item]);
    }

    handleCloseAddModal();
  };

  const handleCreatePurchase = (data: {
    quantity: number;
    unit: string;
    packageType?: string;
    packageQuantity?: number;
    vendorId: string;
    unitPrice: number;
    date: string;
    invoiceNumber?: string;
    seasonYear: number;
  }) => {
    handleAddInventory({
      quantity: data.quantity,
      unit: data.unit,
      packageType: data.packageType,
      packageQuantity: data.packageQuantity,
    });
  };

  const handleDeleteItem = (item: InventoryItem) => {
    onUpdateInventory(inventory.filter((i) => i.id !== item.id));
  };

  const handleEditItem = (item: InventoryItem) => {
    const product = products.find((p) => p.id === item.productId);
    if (product) {
      const vendor = vendors.find((v) => v.id === product.vendorId);
      setSelectedProduct(product);
      setEditingItem(item);
      // Create a minimal context for editing
      setProductContext({
        product,
        vendor,
        onHand: item.quantity,
        plannedUsage: 0,
        status: 'ok',
        shortfall: 0,
        usedIn: [],
      });
      setShowAddModal(true);
    }
  };

  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor?.name || '';
  };

  const packageOptions = useMemo(() => {
    if (!selectedProduct) return [];
    return getDefaultPackagingOptions(selectedProduct.form).map((p) => ({
      label: p.name,
      size: p.unitSize,
      unit: p.unitType,
    }));
  }, [selectedProduct]);

  const usedIn = useMemo(() => {
    if (!productContext) return [];
    return productContext.usedIn.map((u) => ({
      cropName: u.split(' → ')[0] || u,
      timingName: u.split(' → ')[1] || '',
    }));
  }, [productContext]);

  const selectedVendor = useMemo(() => {
    if (!selectedProduct) return null;
    return vendors.find((v) => v.id === selectedProduct.vendorId) || null;
  }, [selectedProduct, vendors]);

  // Build enriched inventory for display
  const enrichedInventory = useMemo(() => {
    return inventory
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const vendorName = getVendorName(product.vendorId);
        const value =
          product.form === 'liquid'
            ? item.quantity * product.price
            : item.quantity * (product.priceUnit === 'ton' ? product.price / 2000 : product.price);
        return {
          ...item,
          productName: product.name,
          vendorName,
          productType: product.form as 'liquid' | 'dry',
          totalValue: value,
          product,
        };
      })
      .filter(Boolean) as (InventoryItem & {
      productName: string;
      vendorName: string;
      productType: 'liquid' | 'dry';
      totalValue: number;
      product: Product;
    })[];
  }, [inventory, products, vendors]);

  // Filter and sort
  const filteredInventory = useMemo(() => {
    return enrichedInventory
      .filter((item) => {
        if (filterType !== 'all' && item.productType !== filterType) return false;
        if (
          searchQuery &&
          !item.productName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !item.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.productName.localeCompare(b.productName);
        if (sortBy === 'value') return b.totalValue - a.totalValue;
        if (sortBy === 'quantity') return b.quantity - a.quantity;
        return 0;
      });
  }, [enrichedInventory, filterType, searchQuery, sortBy]);

  // Summary calculations
  const totalValue = filteredInventory.reduce((sum, item) => sum + item.totalValue, 0);
  const liquidCount = enrichedInventory.filter((i) => i.productType === 'liquid').length;
  const dryCount = enrichedInventory.filter((i) => i.productType === 'dry').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Track your on-hand product quantities</p>
        </div>
        <button
          onClick={() => setShowProductSelector(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Inventory
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">Total Value</div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</div>
          <div className="text-xs text-muted-foreground mt-1">{filteredInventory.length} products</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Droplets className="w-4 h-4 text-blue-500" />
            Liquid Products
          </div>
          <div className="text-2xl font-bold text-foreground">{liquidCount}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Package className="w-4 h-4 text-amber-500" />
            Dry Products
          </div>
          <div className="text-2xl font-bold text-foreground">{dryCount}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Type Filter */}
        <div className="flex bg-muted rounded-lg p-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'liquid', label: 'Liquid' },
            { id: 'dry', label: 'Dry' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as typeof filterType)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterType === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted"
          >
            <ArrowUpDown className="w-4 h-4" />
            Sort
            <ChevronDown className="w-4 h-4" />
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                {[
                  { id: 'name', label: 'Name' },
                  { id: 'value', label: 'Value' },
                  { id: 'quantity', label: 'Quantity' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSortBy(option.id as typeof sortBy);
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                      sortBy === option.id ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Product
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                On Hand
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Value
              </th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredInventory.map((item) => (
              <InventoryRow
                key={item.id}
                item={item}
                onEdit={() => handleEditItem(item)}
                onDelete={() => handleDeleteItem(item)}
              />
            ))}
          </tbody>
        </table>

        {filteredInventory.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No inventory found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term.' : 'Add your first inventory item to get started.'}
            </p>
            <button
              onClick={() => setShowProductSelector(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Inventory
            </button>
          </div>
        )}
      </div>

      {/* Footer Total */}
      {filteredInventory.length > 0 && (
        <div className="flex justify-end mt-4">
          <div className="bg-muted rounded-lg px-4 py-2 border border-border">
            <span className="text-sm text-muted-foreground">Total Value:</span>
            <span className="ml-2 text-lg font-bold text-foreground">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      )}

      {/* Product Selector Modal */}
      <ProductSelectorModal
        open={showProductSelector}
        onOpenChange={setShowProductSelector}
        products={products}
        vendors={vendors}
        inventory={inventory}
        currentSeason={currentSeason}
        onSelectProduct={handleSelectProduct}
      />

      {/* Inventory Add Modal */}
      {showAddModal && selectedProduct && productContext && (
        <AddInventoryModal
          product={selectedProduct}
          vendor={selectedVendor}
          vendors={vendors}
          onHand={productContext.onHand}
          planNeeds={productContext.plannedUsage}
          unit={selectedProduct.form === 'liquid' ? 'gal' : 'lbs'}
          usedIn={usedIn}
          packageOptions={packageOptions}
          priceHistory={[]}
          currentSeasonYear={currentSeason?.year || new Date().getFullYear()}
          onClose={handleCloseAddModal}
          onAddInventory={handleAddInventory}
          onCreatePurchase={handleCreatePurchase}
        />
      )}
    </div>
  );
};

// ============================================================================
// INVENTORY ROW COMPONENT
// ============================================================================

interface EnrichedInventoryItem extends InventoryItem {
  productName: string;
  vendorName: string;
  productType: 'liquid' | 'dry';
  totalValue: number;
  product: Product;
}

interface InventoryRowProps {
  item: EnrichedInventoryItem;
  onEdit: () => void;
  onDelete: () => void;
}

const InventoryRow: React.FC<InventoryRowProps> = ({ item, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  const display = formatInventoryDisplay(
    item.containerCount,
    item.packagingName,
    item.packagingSize,
    item.quantity,
    item.unit
  );

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {/* Product */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              item.productType === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'
            }`}
          >
            {item.productType === 'liquid' ? (
              <Droplets className="w-5 h-5 text-blue-500" />
            ) : (
              <Package className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div>
            <div className="font-medium text-foreground">{item.productName}</div>
            <div className="text-sm text-muted-foreground">{item.vendorName}</div>
          </div>
        </div>
      </td>

      {/* On Hand */}
      <td className="px-4 py-3 text-right">
        <div className="font-medium text-foreground">
          {item.containerCount && item.packagingName ? display.primary : `${item.quantity} ${item.unit}`}
        </div>
        {display.secondary && <div className="text-sm text-muted-foreground">{display.secondary}</div>}
      </td>

      {/* Value */}
      <td className="px-4 py-3 text-right">
        <div className="font-medium text-foreground">{formatCurrency(item.totalValue)}</div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};
