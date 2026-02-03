import React, { useMemo, useState } from 'react';
import { CheckCircle, Truck, AlertTriangle, Package, Droplets, Weight, DollarSign, TrendingUp } from 'lucide-react';
import type { InventoryItem, Product, Vendor, Season } from '@/types/farm';
import type { SimplePurchase, SimplePurchaseLine } from '@/types/simplePurchase';
import { calculatePlannedUsage, type PlannedUsageItem, formatCurrency } from '@/lib/calculations';
import { computeReadiness, type PlannedUsage, type ReadinessExplain, type ReadinessStatus } from '@/lib/readinessEngine';
import { ExplainMathDrawer } from './ExplainMathDrawer';
import { AddInventoryModal } from './AddInventoryModal';
import { ProductSelectorModal, type ProductWithContext } from './ProductSelectorModal';
import { getDefaultPackagingOptions } from '@/lib/packagingUtils';

interface PlanReadinessViewProps {
  inventory: InventoryItem[];
  products: Product[];
  vendors: Vendor[];
  season: Season | null;
  purchases: SimplePurchase[];
  onUpdateInventory: (inventory: InventoryItem[]) => void;
}

type FilterTab = 'blocking' | 'on-order' | 'ready' | 'all';

const fmt = (n: number, decimals = 1) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

function statusPill(status: ReadinessStatus) {
  if (status === 'READY') return { label: 'Ready', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle };
  if (status === 'ON_ORDER') return { label: 'Ordered', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Truck };
  return { label: 'Need to Order', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle };
}

export const PlanReadinessView: React.FC<PlanReadinessViewProps> = ({
  inventory,
  products,
  vendors,
  season,
  purchases,
  onUpdateInventory,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  // Product selector modal state (for browsing all products)
  const [showProductSelector, setShowProductSelector] = useState(false);

  // Add inventory modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productContext, setProductContext] = useState<ProductWithContext | null>(null);

  // Explain drawer state
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainTitle, setExplainTitle] = useState('');
  const [explainStatus, setExplainStatus] = useState<ReadinessStatus>('BLOCKING');
  const [explainData, setExplainData] = useState<ReadinessExplain | null>(null);

  // 1) Calculate planned usage from season/products (existing function)
  const plannedUsage = useMemo(() => calculatePlannedUsage(season, products), [season, products]);

  // 2) Map planned usage -> readiness engine input format
  const plannedForEngine: PlannedUsage[] = useMemo(() => {
    return (plannedUsage || []).map((u: PlannedUsageItem) => {
      const product = products.find(p => p.id === u.productId);
      return {
        id: u.productId,
        label: product?.name || 'Unknown product',
        productId: u.productId,
        requiredQty: u.totalNeeded,
        plannedUnit: u.unit,
        crop: u.usages?.[0]?.cropName,
        passName: u.usages?.[0]?.timingName,
        when: undefined,
      };
    });
  }, [plannedUsage, products]);

  // 3) Filter purchases to current season with 'ordered' status
  const scopedPurchases = useMemo(() => {
    return (purchases || []).filter(p => {
      if (season?.id && p.seasonId !== season.id) return false;
      return p.status === 'ordered';
    });
  }, [purchases, season]);

  // 4) Compute readiness with canonical aggregation
  //    This properly sums ALL inventory rows for each product and includes on-order quantities
  const readiness = useMemo(() => {
    return computeReadiness({
      planned: plannedForEngine,
      inventory,
      orders: scopedPurchases,
      inventoryAccessors: {
        getProductId: (row: InventoryItem) => row.productId,
        getQty: (row: InventoryItem) => row.quantity,
        getContainerCount: (row: InventoryItem) => row.containerCount,
      },
      orderAccessors: {
        orders: scopedPurchases,
        getOrderId: (p: SimplePurchase) => p.id,
        getOrderStatus: (p: SimplePurchase) => p.status,
        getVendorName: (p: SimplePurchase) => vendors.find(v => v.id === p.vendorId)?.name ?? undefined,
        getLines: (p: SimplePurchase) => p.lines || [],
        getLineProductId: (l: SimplePurchaseLine) => l.productId,
        getLineRemainingQty: (l: SimplePurchaseLine) => l.totalQuantity || (l.quantity * (l.packageSize || 1)),
        getLineUnit: (l: SimplePurchaseLine) => l.packageUnit || l.normalizedUnit,
      },
    });
  }, [plannedForEngine, inventory, scopedPurchases, vendors]);

  // Helper: get usages detail for a product (so we can show "used in")
  const usageMap = useMemo(() => {
    const m = new Map<string, PlannedUsageItem['usages']>();
    plannedUsage.forEach(u => m.set(u.productId, u.usages));
    return m;
  }, [plannedUsage]);

  // Filter items for selected tab
  const filteredItems = useMemo(() => {
    if (filterTab === 'all') return readiness.items;
    if (filterTab === 'ready') return readiness.items.filter(i => i.status === 'READY');
    if (filterTab === 'on-order') return readiness.items.filter(i => i.status === 'ON_ORDER');
    return readiness.items.filter(i => i.status === 'BLOCKING');
  }, [readiness.items, filterTab]);

  // Quick-add handler: opens modal pre-filled with product context
  const handleQuickAdd = (productId: string, shortAmount: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const vendor = vendors.find(v => v.id === product.vendorId);
    // Sum ALL inventory rows for this product (matches trust layer logic)
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
      canAddToPlan: product.price !== undefined && product.price > 0,
    };

    setSelectedProduct(product);
    setProductContext(context);
    setShowAddModal(true);
  };

  // Handle inventory addition from modal
  const handleAddInventoryData = (data: { quantity: number; unit: string; packageType?: string; packageQuantity?: number }) => {
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

    // Merge into existing inventory row for this product (if exists)
    const existing = inventory.find(i => i.productId === newItem.productId);
    if (existing) {
      onUpdateInventory(
        inventory.map(i =>
          i.id === existing.id ? { ...i, quantity: i.quantity + newItem.quantity } : i
        )
      );
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
    // For now, treat as inventory addition
    handleAddInventoryData(data);
  };

  // Derived values for modal
  const packageOptions = useMemo(() => {
    if (!selectedProduct) return [];
    return getDefaultPackagingOptions(selectedProduct.form).map(p => ({
      label: p.name,
      size: p.unitSize,
      unit: p.unitType,
    }));
  }, [selectedProduct]);

  const usedInForModal = useMemo(() => {
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

  // Calculate value-based metrics
  const valueMetrics = useMemo(() => {
    let onHandValue = 0;
    let onOrderValue = 0;
    let plannedValue = 0;

    readiness.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const price = product?.price || 0;

      onHandValue += item.onHandQty * price;
      onOrderValue += item.onOrderQty * price;
      plannedValue += item.requiredQty * price;
    });

    const shortValue = Math.max(0, plannedValue - onHandValue - onOrderValue);
    const coveragePct = plannedValue > 0 
      ? Math.min(100, ((onHandValue + onOrderValue) / plannedValue) * 100)
      : 100;

    return { onHandValue, onOrderValue, plannedValue, shortValue, coveragePct };
  }, [readiness.items, products]);

  // Progress bar percentages
  const total = readiness.totalCount || 1;
  const readyPct = (readiness.readyCount / total) * 100;
  const onOrderPct = (readiness.onOrderCount / total) * 100;
  const blockingPct = (readiness.blockingCount / total) * 100;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-800">Order Status</h2>
            <p className="text-sm text-stone-500 mt-1">
              Product availability for your {season?.year || 'current'} crop plans
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-stone-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-stone-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{readiness.totalCount}</p>
                <p className="text-sm text-stone-500">Total Products</p>
              </div>
            </div>
          </div>
          
          <div className="bg-emerald-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{readiness.readyCount}</p>
                <p className="text-sm text-stone-500">Ready</p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{readiness.onOrderCount}</p>
                <p className="text-sm text-stone-500">Ordered</p>
              </div>
            </div>
          </div>
          
          <div className="bg-rose-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-600">{readiness.blockingCount}</p>
                <p className="text-sm text-stone-500">Need to Order</p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(valueMetrics.onHandValue)}</p>
                <p className="text-xs text-stone-500">On Hand Value</p>
              </div>
            </div>
          </div>
          
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(valueMetrics.onOrderValue)}</p>
                <p className="text-xs text-stone-500">On Order Value</p>
              </div>
            </div>
          </div>
          
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-rose-600">{formatCurrency(valueMetrics.shortValue)}</p>
                <p className="text-xs text-stone-500">Still Needed</p>
              </div>
            </div>
          </div>
          
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-blue-600">{Math.round(valueMetrics.coveragePct)}%</p>
                <p className="text-xs text-stone-500">Coverage by Value</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-stone-500 mb-2">
            <span>Plan Coverage</span>
            <span>{Math.round(readyPct)}% ready</span>
          </div>
          <div className="h-3 bg-stone-100 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 transition-all" style={{ width: `${readyPct}%` }} />
            <div className="bg-amber-500 transition-all" style={{ width: `${onOrderPct}%` }} />
            <div className="bg-rose-500 transition-all" style={{ width: `${blockingPct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="text-stone-600">Ready ({readiness.readyCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full" />
              <span className="text-stone-600">Ordered ({readiness.onOrderCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-rose-500 rounded-full" />
              <span className="text-stone-600">Need to Order ({readiness.blockingCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
      {([
          { id: 'all', label: 'All', count: readiness.totalCount },
          { id: 'blocking', label: 'Need to Order', count: readiness.blockingCount },
          { id: 'on-order', label: 'Ordered', count: readiness.onOrderCount },
          { id: 'ready', label: 'Ready', count: readiness.readyCount },
        ] as Array<{ id: FilterTab; label: string; count: number }>).map(t => (
          <button
            key={t.id}
            onClick={() => setFilterTab(t.id)}
            className={
              'px-4 py-2 rounded-xl border text-sm font-semibold transition ' +
              (filterTab === t.id
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50')
            }
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="grid grid-cols-12 bg-stone-50 px-5 py-3 text-xs font-semibold text-stone-600">
          <div className="col-span-4">Product</div>
          <div className="col-span-2">Need</div>
          <div className="col-span-2">On Hand</div>
          <div className="col-span-2">On Order</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-stone-200">
          {filteredItems.map(item => {
            const p = statusPill(item.status);
            const usages = usageMap.get(item.productId) || [];
            const usedIn = usages.slice(0, 2).map(u => `${u.cropName} → ${u.timingName}`).join(' • ');
            const product = products.find(pr => pr.id === item.productId);

            return (
              <div key={item.id} className="grid grid-cols-12 px-5 py-4 text-sm text-stone-800 hover:bg-stone-50">
                <div className="col-span-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      product?.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'
                    }`}>
                      {product?.form === 'liquid' 
                        ? <Droplets className="w-5 h-5 text-blue-600" /> 
                        : <Weight className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div>
                      <div className="font-semibold">{item.label}</div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${p.cls}`}>
                          <p.icon className="w-3.5 h-3.5" />
                          {p.label}
                        </span>
                        {usedIn && <span className="text-xs text-stone-500">{usedIn}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 flex items-center">
                  {fmt(item.requiredQty)} {item.plannedUnit}
                </div>
                <div className="col-span-2 flex items-center">
                  {fmt(item.onHandQty)} {item.plannedUnit}
                </div>
                <div className="col-span-2 flex items-center">
                  {fmt(item.onOrderQty)} {item.plannedUnit}
                </div>

                <div className="col-span-2 flex justify-end items-center gap-2">
                  {item.status === 'BLOCKING' && (
                    <button
                      onClick={() => handleQuickAdd(item.productId, item.shortQty)}
                      className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100"
                    >
                      Add {fmt(item.shortQty, 0)}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setExplainTitle(item.label);
                      setExplainStatus(item.status);
                      setExplainData(item.explain);
                      setExplainOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold hover:bg-stone-50"
                  >
                    Explain
                  </button>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="px-5 py-12 text-center">
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

      {/* Explain drawer */}
      <ExplainMathDrawer
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        title={explainTitle}
        explain={explainData}
        status={explainStatus}
        renderInventoryRow={(row) => {
          const product = products.find(p => p.id === row.productId);
          return (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-stone-600">
                  {row.packagingName || `Inventory`}
                </span>
                {row.containerCount && (
                  <span className="text-xs text-stone-400 ml-2">
                    ({row.containerCount} containers)
                  </span>
                )}
              </div>
              <span className="font-semibold">
                {fmt(row.quantity ?? 0)} {row.unit || (product?.form === 'liquid' ? 'gal' : 'lbs')}
              </span>
            </div>
          );
        }}
      />

      {/* Add inventory modal */}
      {showAddModal && selectedProduct && productContext && (
        <AddInventoryModal
          product={selectedProduct}
          vendor={selectedVendor}
          vendors={vendors}
          onHand={productContext.onHand}
          planNeeds={productContext.plannedUsage}
          unit={selectedProduct.form === 'liquid' ? 'gal' : 'lbs'}
          usedIn={usedInForModal}
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

      {/* Product Selector Modal (hidden, but keeps imports working) */}
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
    </div>
  );
};
