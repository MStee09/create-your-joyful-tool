import React, { useState, useMemo } from 'react';
import { Droplets, Weight, Package, CheckCircle, Truck, AlertTriangle } from 'lucide-react';
import type { InventoryItem, Product, Vendor, Season } from '@/types/farm';
import { calculatePlannedUsage, PlannedUsageItem } from '@/lib/calculations';
import { formatCurrency } from '@/utils/farmUtils';
import { ProductSelectorModal, type ProductWithContext } from './ProductSelectorModal';
import { AddInventoryModal } from './AddInventoryModal';
import { formatInventoryDisplay, getDefaultPackagingOptions } from '@/lib/packagingUtils';

interface PlanReadinessViewProps {
  inventory: InventoryItem[];
  products: Product[];
  vendors: Vendor[];
  season: Season | null;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
}

const formatNumber = (n: number, decimals = 1) => {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

type FilterTab = 'blocking' | 'on-order' | 'ready' | 'all';

export const PlanReadinessView: React.FC<PlanReadinessViewProps> = ({
  inventory,
  products,
  vendors,
  season,
  onUpdateInventory,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productContext, setProductContext] = useState<ProductWithContext | null>(null);

  // Calculate planned usage
  const plannedUsage = useMemo(() => 
    calculatePlannedUsage(season, products), 
    [season, products]
  );

  // Build readiness data
  const readinessData = useMemo(() => {
    const blocking: Array<{
      product: Product;
      needed: number;
      onHand: number;
      short: number;
      unit: 'gal' | 'lbs';
      usages: PlannedUsageItem['usages'];
      inventoryItem?: InventoryItem;
    }> = [];
    
    const ready: Array<{
      product: Product;
      needed: number;
      onHand: number;
      remaining: number;
      unit: 'gal' | 'lbs';
      value: number;
      usages: PlannedUsageItem['usages'];
      inventoryId?: string;
      inventoryItem?: InventoryItem;
    }> = [];

    const onOrder: Array<{
      product: Product;
      needed: number;
      onHand: number;
      onOrderQty: number;
      unit: 'gal' | 'lbs';
      usages: PlannedUsageItem['usages'];
    }> = [];
    
    const planned: Array<{
      product: Product;
      needed: number;
      onHand: number;
      remaining: number;
      unit: 'gal' | 'lbs';
      value: number;
      usages: PlannedUsageItem['usages'];
      inventoryId?: string;
      inventoryItem?: InventoryItem;
    }> = [];
    
    plannedUsage.forEach(usage => {
      const product = products.find(p => p.id === usage.productId);
      if (!product) return;
      
      const invItem = inventory.find(i => i.productId === usage.productId);
      const onHand = invItem?.quantity || 0;
      const remaining = onHand - usage.totalNeeded;
      
      let value = onHand * product.price;
      if (product.priceUnit === 'ton') {
        value = (onHand / 2000) * product.price;
      }
      
      if (remaining < 0) {
        blocking.push({
          product,
          needed: usage.totalNeeded,
          onHand,
          short: Math.abs(remaining),
          unit: usage.unit,
          usages: usage.usages,
          inventoryItem: invItem,
        });
      } else {
        ready.push({
          product,
          needed: usage.totalNeeded,
          onHand,
          remaining,
          unit: usage.unit,
          value,
          usages: usage.usages,
          inventoryId: invItem?.id,
          inventoryItem: invItem,
        });
      }
      
      planned.push({
        product,
        needed: usage.totalNeeded,
        onHand,
        remaining,
        unit: usage.unit,
        value,
        usages: usage.usages,
        inventoryId: invItem?.id,
        inventoryItem: invItem,
      });
    });
    
    return { blocking, ready, onOrder, planned };
  }, [plannedUsage, inventory, products]);

  const handleQuickAddFromBlocking = (productId: string, shortAmount: number, unit: 'gal' | 'lbs') => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const vendor = vendors.find(v => v.id === product.vendorId);
    const invItems = inventory.filter(i => i.productId === productId);
    const onHand = invItems.reduce((sum, i) => sum + i.quantity, 0);
    const usageItem = plannedUsage.find(u => u.productId === productId);
    const plannedNeeded = usageItem?.totalNeeded || 0;
    const usedIn = usageItem?.usages.map(u => `${u.cropName} → ${u.timingName}`) || [];
    
    const context: ProductWithContext = {
      product,
      vendor,
      plannedUsage: plannedNeeded,
      onHand,
      status: shortAmount > 0 ? 'short' : 'ok',
      shortfall: shortAmount,
      usedIn,
    };
    
    setSelectedProduct(product);
    setProductContext(context);
    setShowAddModal(true);
  };

  const handleAddInventoryData = (data: {
    quantity: number;
    unit: string;
    packageType?: string;
    packageQuantity?: number;
  }) => {
    if (!selectedProduct) return;
    
    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      productId: selectedProduct.id,
      quantity: data.quantity,
      unit: data.unit as 'gal' | 'lbs',
      packagingName: data.packageType,
      packagingSize: data.packageQuantity ? data.quantity / data.packageQuantity : undefined,
      containerCount: data.packageQuantity,
    };
    
    const existing = inventory.find(i => i.productId === newItem.productId);
    if (existing) {
      onUpdateInventory(inventory.map(i => i.id === existing.id 
        ? { ...i, quantity: i.quantity + newItem.quantity }
        : i
      ));
    } else {
      onUpdateInventory([...inventory, newItem]);
    }
    
    setShowAddModal(false);
    setSelectedProduct(null);
    setProductContext(null);
  };

  const handleCreatePurchase = (data: {
    quantity: number;
    unit: string;
    packageType?: string;
    packageQuantity?: number;
  }) => {
    handleAddInventoryData(data);
  };

  // Summary counts
  const totalProducts = readinessData.planned.length;
  const readyCount = readinessData.ready.length;
  const onOrderCount = readinessData.onOrder.length;
  const blockingCount = readinessData.blocking.length;

  // Progress bar percentages
  const total = totalProducts || 1;
  const readyPct = (readyCount / total) * 100;
  const onOrderPct = (onOrderCount / total) * 100;
  const blockingPct = (blockingCount / total) * 100;

  // Filter items based on tab
  const filteredPlanned = useMemo(() => {
    switch (filterTab) {
      case 'blocking':
        return readinessData.planned.filter(p => p.remaining < 0);
      case 'ready':
        return readinessData.planned.filter(p => p.remaining >= 0);
      case 'on-order':
        return []; // No on-order items yet
      default:
        return readinessData.planned;
    }
  }, [filterTab, readinessData.planned]);

  const packageOptions = useMemo(() => {
    if (!selectedProduct) return [];
    return getDefaultPackagingOptions(selectedProduct.form).map(p => ({
      label: p.name,
      size: p.unitSize,
      unit: p.unitType,
    }));
  }, [selectedProduct]);

  const usedIn = useMemo(() => {
    if (!productContext) return [];
    return productContext.usedIn.map(u => ({
      cropName: u.split(' → ')[0] || u,
      timingName: u.split(' → ')[1] || '',
    }));
  }, [productContext]);

  const selectedVendor = useMemo(() => {
    if (!selectedProduct) return null;
    return vendors.find(v => v.id === selectedProduct.vendorId) || null;
  }, [selectedProduct, vendors]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-stone-800">Plan Readiness</h2>
        <p className="text-stone-500 mt-1">Track inventory coverage for your crop plans</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-800">{totalProducts}</p>
              <p className="text-sm text-stone-500">Total Products</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{readyCount}</p>
              <p className="text-sm text-stone-500">Ready</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{onOrderCount}</p>
              <p className="text-sm text-stone-500">On Order</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{blockingCount}</p>
              <p className="text-sm text-stone-500">Blocking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 mb-6">
        <div className="flex items-center justify-between text-sm text-stone-500 mb-2">
          <span>Plan Coverage</span>
          <span>{Math.round(readyPct)}% ready</span>
        </div>
        <div className="h-3 bg-stone-100 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-emerald-500 transition-all" 
            style={{ width: `${readyPct}%` }} 
          />
          <div 
            className="h-full bg-blue-500 transition-all" 
            style={{ width: `${onOrderPct}%` }} 
          />
          <div 
            className="h-full bg-red-500 transition-all" 
            style={{ width: `${blockingPct}%` }} 
          />
        </div>
        <div className="flex items-center gap-6 mt-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            <span className="text-stone-600">Ready ({readyCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-stone-600">On Order ({onOrderCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-stone-600">Blocking ({blockingCount})</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'all' as FilterTab, label: 'All', count: totalProducts },
          { id: 'blocking' as FilterTab, label: 'Blocking', count: blockingCount },
          { id: 'on-order' as FilterTab, label: 'On Order', count: onOrderCount },
          { id: 'ready' as FilterTab, label: 'Ready', count: readyCount },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterTab === tab.id
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Blocking Section */}
      {(filterTab === 'all' || filterTab === 'blocking') && readinessData.blocking.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wider">
              Blocking Plan Execution
            </h3>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-red-100">
              {readinessData.blocking.map(item => (
                <div key={item.product.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.product.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'
                    }`}>
                      {item.product.form === 'liquid' 
                        ? <Droplets className="w-5 h-5 text-blue-600" /> 
                        : <Weight className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase tracking-wide">
                        {vendors.find(v => v.id === item.product.vendorId)?.name || ''}
                      </p>
                      <p className="font-medium text-stone-800">{item.product.name}</p>
                      <p className="text-sm text-stone-500">
                        {item.usages.map(u => u.cropName).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-stone-500">
                        Need {formatNumber(item.needed, 1)} {item.unit}, have {formatNumber(item.onHand, 1)}
                      </p>
                      <p className="font-semibold text-red-600">
                        Short {formatNumber(item.short, 1)} {item.unit}
                      </p>
                    </div>
                    <button
                      onClick={() => handleQuickAddFromBlocking(item.product.id, item.short, item.unit)}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                    >
                      Add {formatNumber(item.short, 1)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Planned Usage Overview Table */}
      <div>
        <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wider mb-3">
          Planned Usage Overview
        </h3>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">Product</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">On Hand</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">Planned</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredPlanned.map(item => (
                <tr key={item.product.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        item.product.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'
                      }`}>
                        {item.product.form === 'liquid' 
                          ? <Droplets className="w-5 h-5 text-blue-600" /> 
                          : <Weight className="w-5 h-5 text-amber-600" />}
                      </div>
                      <div>
                        <span className="font-medium text-stone-800">{item.product.name}</span>
                        <p className="text-xs text-stone-400">
                          {item.usages.map(u => `${u.cropName} → ${u.timingName}`).join(', ')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-stone-700">{formatNumber(item.onHand, 1)} {item.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-stone-600">
                    {formatNumber(item.needed, 1)} {item.unit}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-semibold ${item.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.remaining >= 0 ? '+' : ''}{formatNumber(item.remaining, 1)} {item.unit}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPlanned.length === 0 && (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h3 className="font-semibold text-stone-800 mb-2">No items in this category</h3>
              <p className="text-stone-500">
                {filterTab === 'blocking' && 'Great news! No items are blocking plan execution.'}
                {filterTab === 'on-order' && 'No items are currently on order.'}
                {filterTab === 'ready' && 'No items are fully covered yet.'}
                {filterTab === 'all' && 'Add products to your crop plans to see readiness status.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Product Selector Modal */}
      <ProductSelectorModal
        open={showProductSelector}
        onOpenChange={setShowProductSelector}
        products={products}
        vendors={vendors}
        inventory={inventory}
        currentSeason={season}
        onSelectProduct={(product, context) => {
          setSelectedProduct(product);
          setProductContext(context);
          setShowProductSelector(false);
          setShowAddModal(true);
        }}
      />

      {/* Add Inventory Modal */}
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
          currentSeasonYear={season?.year || new Date().getFullYear()}
          onClose={() => {
            setShowAddModal(false);
            setSelectedProduct(null);
            setProductContext(null);
          }}
          onAddInventory={handleAddInventoryData}
          onCreatePurchase={handleCreatePurchase}
        />
      )}
    </div>
  );
};
