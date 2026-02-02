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
  Truck,
  Calendar,
} from 'lucide-react';
import type { InventoryItem, Product, Vendor, Season } from '@/types/farm';
import type { SimplePurchase } from '@/types/simplePurchase';
import { formatCurrency, generateId } from '@/utils/farmUtils';
import { ProductSelectorModal, type ProductWithContext } from './ProductSelectorModal';
import { AddInventoryModal } from './AddInventoryModal';
import { formatInventoryDisplay, getDefaultPackagingOptions } from '@/lib/packagingUtils';
import { format } from 'date-fns';

type InventoryTab = 'all' | 'on-hand' | 'ordered';

interface InventoryViewProps {
  inventory: InventoryItem[];
  products: Product[];
  vendors?: Vendor[];
  currentSeason?: Season | null;
  season?: Season | null;
  purchases?: SimplePurchase[];
  onUpdateInventory: (inventory: InventoryItem[]) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  products,
  vendors = [],
  currentSeason = null,
  season = null,
  purchases = [],
  onUpdateInventory,
}) => {
  const activeSeason = season || currentSeason;
  
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productContext, setProductContext] = useState<ProductWithContext | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [activeTab, setActiveTab] = useState<InventoryTab>('all');
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

  // Build enriched inventory for display (On Hand)
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
          source: 'on-hand' as const,
        };
      })
      .filter(Boolean) as EnrichedInventoryItem[];
  }, [inventory, products, vendors]);

  // Build ordered items from SimplePurchases with status='ordered'
  const orderedItems = useMemo(() => {
    const orderedPurchases = purchases.filter(p => 
      p.status === 'ordered' && 
      (activeSeason ? p.seasonId === activeSeason.id : true)
    );
    
    const items: OrderedItem[] = [];
    
    for (const purchase of orderedPurchases) {
      const vendor = vendors.find(v => v.id === purchase.vendorId);
      
      for (const line of purchase.lines) {
        const product = products.find(p => p.id === line.productId);
        if (!product) continue;
        
        items.push({
          id: `${purchase.id}-${line.id}`,
          purchaseId: purchase.id,
          productId: line.productId,
          productName: product.name,
          vendorId: purchase.vendorId,
          vendorName: vendor?.name || 'Unknown Vendor',
          quantity: line.totalQuantity,
          unit: line.normalizedUnit,
          packageInfo: line.packageType 
            ? `${line.quantity} × ${line.packageType}${line.packageSize ? ` (${line.packageSize} ${line.packageUnit})` : ''}`
            : undefined,
          orderDate: purchase.orderDate,
          expectedDeliveryDate: purchase.expectedDeliveryDate,
          productType: product.form as 'liquid' | 'dry',
          totalValue: line.totalPrice,
          product,
        });
      }
    }
    
    return items;
  }, [purchases, products, vendors, activeSeason]);

  // Combine On Hand + Ordered for "All" view
  const combinedInventory = useMemo(() => {
    // Group by product for combined display
    const productMap = new Map<string, {
      onHand: number;
      onHandValue: number;
      ordered: number;
      orderedValue: number;
      product: Product;
      productName: string;
      vendorName: string;
      productType: 'liquid' | 'dry';
      unit: string;
      orderedItems: OrderedItem[];
      onHandItems: EnrichedInventoryItem[];
    }>();

    // Add on-hand items
    for (const item of enrichedInventory) {
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.onHand += item.quantity;
        existing.onHandValue += item.totalValue;
        existing.onHandItems.push(item);
      } else {
        productMap.set(item.productId, {
          onHand: item.quantity,
          onHandValue: item.totalValue,
          ordered: 0,
          orderedValue: 0,
          product: item.product,
          productName: item.productName,
          vendorName: item.vendorName,
          productType: item.productType,
          unit: item.unit || (item.productType === 'liquid' ? 'gal' : 'lbs'),
          orderedItems: [],
          onHandItems: [item],
        });
      }
    }

    // Add ordered items
    for (const item of orderedItems) {
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.ordered += item.quantity;
        existing.orderedValue += item.totalValue;
        existing.orderedItems.push(item);
      } else {
        productMap.set(item.productId, {
          onHand: 0,
          onHandValue: 0,
          ordered: item.quantity,
          orderedValue: item.totalValue,
          product: item.product,
          productName: item.productName,
          vendorName: item.vendorName,
          productType: item.productType,
          unit: item.unit,
          orderedItems: [item],
          onHandItems: [],
        });
      }
    }

    return Array.from(productMap.values());
  }, [enrichedInventory, orderedItems]);

  // Filter and sort based on active tab
  const filteredInventory = useMemo(() => {
    if (activeTab === 'on-hand') {
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
    }
    return [];
  }, [enrichedInventory, filterType, searchQuery, sortBy, activeTab]);

  const filteredOrdered = useMemo(() => {
    if (activeTab === 'ordered') {
      return orderedItems
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
    }
    return [];
  }, [orderedItems, filterType, searchQuery, sortBy, activeTab]);

  const filteredCombined = useMemo(() => {
    if (activeTab === 'all') {
      return combinedInventory
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
          if (sortBy === 'value') return (b.onHandValue + b.orderedValue) - (a.onHandValue + a.orderedValue);
          if (sortBy === 'quantity') return (b.onHand + b.ordered) - (a.onHand + a.ordered);
          return 0;
        });
    }
    return [];
  }, [combinedInventory, filterType, searchQuery, sortBy, activeTab]);

  // Summary calculations
  const onHandTotal = enrichedInventory.reduce((sum, item) => sum + item.totalValue, 0);
  const orderedTotal = orderedItems.reduce((sum, item) => sum + item.totalValue, 0);
  const totalValue = onHandTotal + orderedTotal;
  const liquidCount = enrichedInventory.filter((i) => i.productType === 'liquid').length;
  const dryCount = enrichedInventory.filter((i) => i.productType === 'dry').length;
  const orderedCount = orderedItems.length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">Track your on-hand and ordered products</p>
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">On Hand</div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(onHandTotal)}</div>
          <div className="text-xs text-muted-foreground mt-1">{enrichedInventory.length} items</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Truck className="w-4 h-4 text-purple-500" />
            Ordered
          </div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(orderedTotal)}</div>
          <div className="text-xs text-muted-foreground mt-1">{orderedCount} pending</div>
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

      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {[
          { id: 'all', label: 'All', count: combinedInventory.length },
          { id: 'on-hand', label: 'On Hand', count: enrichedInventory.length },
          { id: 'ordered', label: 'Ordered', count: orderedCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as InventoryTab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
              activeTab === tab.id ? 'bg-primary/10' : 'bg-muted'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
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

      {/* Table based on active tab */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {activeTab === 'all' && (
          <>
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
                    Ordered
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCombined.map((item) => (
                  <CombinedRow key={item.product.id} item={item} />
                ))}
              </tbody>
            </table>
            {filteredCombined.length === 0 && (
              <EmptyState 
                searchQuery={searchQuery} 
                onAddClick={() => setShowProductSelector(true)} 
                message="No inventory or pending orders found"
              />
            )}
          </>
        )}

        {activeTab === 'on-hand' && (
          <>
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
              <EmptyState 
                searchQuery={searchQuery} 
                onAddClick={() => setShowProductSelector(true)} 
                message="No on-hand inventory found"
              />
            )}
          </>
        )}

        {activeTab === 'ordered' && (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Product
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Expected Delivery
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrdered.map((item) => (
                  <OrderedRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
            {filteredOrdered.length === 0 && (
              <div className="text-center py-12">
                <Truck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No pending orders</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try a different search term.' : 'All orders have been received.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Total */}
      <div className="flex justify-end mt-4 gap-4">
        {activeTab === 'all' && (
          <>
            <div className="bg-muted rounded-lg px-4 py-2 border border-border">
              <span className="text-sm text-muted-foreground">On Hand:</span>
              <span className="ml-2 font-bold text-foreground">{formatCurrency(onHandTotal)}</span>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg px-4 py-2 border border-purple-200 dark:border-purple-800">
              <span className="text-sm text-purple-600 dark:text-purple-400">Ordered:</span>
              <span className="ml-2 font-bold text-purple-700 dark:text-purple-300">{formatCurrency(orderedTotal)}</span>
            </div>
            <div className="bg-card rounded-lg px-4 py-2 border-2 border-primary">
              <span className="text-sm text-muted-foreground">Total Position:</span>
              <span className="ml-2 text-lg font-bold text-foreground">{formatCurrency(totalValue)}</span>
            </div>
          </>
        )}
        {activeTab === 'on-hand' && filteredInventory.length > 0 && (
          <div className="bg-muted rounded-lg px-4 py-2 border border-border">
            <span className="text-sm text-muted-foreground">On Hand Value:</span>
            <span className="ml-2 text-lg font-bold text-foreground">{formatCurrency(onHandTotal)}</span>
          </div>
        )}
        {activeTab === 'ordered' && filteredOrdered.length > 0 && (
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg px-4 py-2 border border-purple-200 dark:border-purple-800">
            <span className="text-sm text-purple-600 dark:text-purple-400">Ordered Value:</span>
            <span className="ml-2 text-lg font-bold text-purple-700 dark:text-purple-300">{formatCurrency(orderedTotal)}</span>
          </div>
        )}
      </div>

      {/* Product Selector Modal */}
      <ProductSelectorModal
        open={showProductSelector}
        onOpenChange={setShowProductSelector}
        products={products}
        vendors={vendors}
        inventory={inventory}
        currentSeason={activeSeason}
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
          currentSeasonYear={activeSeason?.year || new Date().getFullYear()}
          onClose={handleCloseAddModal}
          onAddInventory={handleAddInventory}
          onCreatePurchase={handleCreatePurchase}
        />
      )}
    </div>
  );
};

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  searchQuery: string;
  onAddClick: () => void;
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ searchQuery, onAddClick, message }) => (
  <div className="text-center py-12">
    <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-foreground mb-2">{message}</h3>
    <p className="text-muted-foreground mb-4">
      {searchQuery ? 'Try a different search term.' : 'Add your first inventory item to get started.'}
    </p>
    <button
      onClick={onAddClick}
      className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium"
    >
      <Plus className="w-5 h-5" />
      Add Inventory
    </button>
  </div>
);

// ============================================================================
// TYPES
// ============================================================================

interface EnrichedInventoryItem extends InventoryItem {
  productName: string;
  vendorName: string;
  productType: 'liquid' | 'dry';
  totalValue: number;
  product: Product;
  source: 'on-hand';
}

interface OrderedItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  vendorId: string;
  vendorName: string;
  quantity: number;
  unit: string;
  packageInfo?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  productType: 'liquid' | 'dry';
  totalValue: number;
  product: Product;
}

// ============================================================================
// INVENTORY ROW COMPONENT (On Hand)
// ============================================================================

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

// ============================================================================
// ORDERED ROW COMPONENT
// ============================================================================

interface OrderedRowProps {
  item: OrderedItem;
}

const OrderedRow: React.FC<OrderedRowProps> = ({ item }) => {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {/* Product */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100">
            <Truck className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-foreground">{item.productName}</div>
            <div className="text-sm text-muted-foreground">{item.vendorName}</div>
          </div>
        </div>
      </td>

      {/* Quantity */}
      <td className="px-4 py-3 text-right">
        <div className="font-medium text-foreground">
          {item.quantity.toLocaleString()} {item.unit}
        </div>
        {item.packageInfo && (
          <div className="text-sm text-muted-foreground">{item.packageInfo}</div>
        )}
      </td>

      {/* Expected Delivery */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {item.expectedDeliveryDate 
              ? format(new Date(item.expectedDeliveryDate), 'MMM d, yyyy')
              : 'TBD'
            }
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Ordered {format(new Date(item.orderDate), 'MMM d')}
        </div>
      </td>

      {/* Value */}
      <td className="px-4 py-3 text-right">
        <div className="font-medium text-foreground">{formatCurrency(item.totalValue)}</div>
      </td>
    </tr>
  );
};

// ============================================================================
// COMBINED ROW COMPONENT (All tab)
// ============================================================================

interface CombinedItem {
  onHand: number;
  onHandValue: number;
  ordered: number;
  orderedValue: number;
  product: Product;
  productName: string;
  vendorName: string;
  productType: 'liquid' | 'dry';
  unit: string;
  orderedItems: OrderedItem[];
  onHandItems: EnrichedInventoryItem[];
}

interface CombinedRowProps {
  item: CombinedItem;
}

const CombinedRow: React.FC<CombinedRowProps> = ({ item }) => {
  const hasOrdered = item.ordered > 0;
  const hasOnHand = item.onHand > 0;

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
        {hasOnHand ? (
          <div className="font-medium text-foreground">
            {item.onHand.toLocaleString()} {item.unit}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* Ordered */}
      <td className="px-4 py-3 text-right">
        {hasOrdered ? (
          <div className="flex items-center justify-end gap-2">
            <Truck className="w-4 h-4 text-purple-500" />
            <span className="font-medium text-foreground">
              {item.ordered.toLocaleString()} {item.unit}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* Total Value */}
      <td className="px-4 py-3 text-right">
        <div className="font-medium text-foreground">
          {formatCurrency(item.onHandValue + item.orderedValue)}
        </div>
        {hasOnHand && hasOrdered && (
          <div className="text-xs text-muted-foreground">
            {formatCurrency(item.onHandValue)} + {formatCurrency(item.orderedValue)}
          </div>
        )}
      </td>
    </tr>
  );
};
