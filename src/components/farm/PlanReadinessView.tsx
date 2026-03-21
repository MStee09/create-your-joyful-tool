import React, { useMemo, useState } from 'react';
import { CheckCircle, Truck, AlertTriangle, Package, Droplets, Weight, DollarSign, TrendingUp, Building2, List, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import type { InventoryItem, Product, Vendor, Season, TimingBucket } from '@/types/farm';
import type { ProductMaster, VendorOffering } from '@/types';
import type { SimplePurchase, SimplePurchaseLine } from '@/types/simplePurchase';
import { calculatePlannedUsage, type PlannedUsageItem, formatCurrency } from '@/lib/calculations';
import { computeReadiness, type PlannedUsage, type ReadinessExplain, type ReadinessStatus } from '@/lib/readinessEngine';
import { getInventoryUnitPrice, getPlannedUnitPrice } from '@/lib/planReadinessUtils';
import { convertPurchaseLineToBaseUnit } from '@/lib/cropCalculations';
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
  onNavigateToPurchases?: () => void;
  productMasters?: ProductMaster[];
  vendorOfferings?: VendorOffering[];
}

type FilterTab = 'blocking' | 'near-ready' | 'on-order' | 'ready' | 'all';
type ViewMode = 'product' | 'company';

const fmt = (n: number, decimals = 1) =>
  (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

function statusPill(status: ReadinessStatus) {
  if (status === 'READY') return { label: 'Ready', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle };
  if (status === 'ON_ORDER') return { label: 'Ordered', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Truck };
  if (status === 'NEAR_READY') return { label: 'Near Ready', cls: 'bg-sky-50 text-sky-700 border-sky-200', icon: Clock };
  return { label: 'Need to Order', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle };
}

export const PlanReadinessView: React.FC<PlanReadinessViewProps> = ({
  inventory,
  products,
  vendors,
  season,
  purchases,
  onUpdateInventory,
  onNavigateToPurchases,
  productMasters = [],
  vendorOfferings = [],
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('product');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
      return p.status === 'ordered' || p.status === 'booked';
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
        getLineRemainingQty: (l: SimplePurchaseLine) => {
          const product = products.find(p => p.id === l.productId);
          return convertPurchaseLineToBaseUnit(l, product);
        },
        getLineUnit: (l: SimplePurchaseLine) => l.packageUnit || l.normalizedUnit,
      },
    });
  }, [plannedForEngine, inventory, scopedPurchases, vendors]);

  // Post-process: remap BLOCKING items with ≥95% coverage to NEAR_READY
  const processedReadiness = useMemo(() => {
    const items = readiness.items.map(item => {
      if (item.status === 'BLOCKING' && item.requiredQty > 0) {
        const coverage = (item.onHandQty + item.onOrderQty) / item.requiredQty;
        if (coverage >= 0.95) {
          return { ...item, status: 'NEAR_READY' as ReadinessStatus };
        }
      }
      return item;
    });
    const readyCount = items.filter(i => i.status === 'READY').length;
    const onOrderCount = items.filter(i => i.status === 'ON_ORDER').length;
    const nearReadyCount = items.filter(i => i.status === 'NEAR_READY').length;
    const blockingCount = items.filter(i => i.status === 'BLOCKING').length;
    return {
      ...readiness,
      items,
      readyCount,
      onOrderCount,
      nearReadyCount,
      blockingCount,
      totalCount: items.length,
    };
  }, [readiness]);
  // Helper: get usages detail for a product (so we can show "used in")
  const usageMap = useMemo(() => {
    const m = new Map<string, PlannedUsageItem['usages']>();
    plannedUsage.forEach(u => m.set(u.productId, u.usages));
    return m;
  }, [plannedUsage]);

  // Map productId → earliest timing bucket
  const BUCKET_ORDER: TimingBucket[] = ['PRE_PLANT', 'AT_PLANTING', 'IN_SEASON', 'POST_HARVEST'];
  const BUCKET_BADGE: Record<TimingBucket, { label: string; cls: string }> = {
    'PRE_PLANT': { label: 'Pre-Plant', cls: 'bg-amber-100 text-amber-700' },
    'AT_PLANTING': { label: 'At Planting', cls: 'bg-emerald-100 text-emerald-700' },
    'IN_SEASON': { label: 'In-Season', cls: 'bg-blue-100 text-blue-700' },
    'POST_HARVEST': { label: 'Post-Harvest', cls: 'bg-purple-100 text-purple-700' },
  };

  const productTimingBucket = useMemo(() => {
    const m = new Map<string, TimingBucket>();
    if (!season) return m;
    season.crops.forEach(crop => {
      // Build timingId → bucket map
      const timingBucketMap = new Map<string, TimingBucket>();
      crop.applicationTimings.forEach(t => {
        timingBucketMap.set(t.id, t.timingBucket || 'IN_SEASON');
      });
      // For each application, find the product's earliest bucket
      crop.applications.forEach(app => {
        const bucket = timingBucketMap.get(app.timingId) || 'IN_SEASON';
        const existing = m.get(app.productId);
        if (!existing || BUCKET_ORDER.indexOf(bucket) < BUCKET_ORDER.indexOf(existing)) {
          m.set(app.productId, bucket);
        }
      });
    });
    return m;
  }, [season]);

  // Filter items for selected tab
  const filteredItems = useMemo(() => {
    let items = processedReadiness.items;
    if (filterTab === 'ready') items = items.filter(i => i.status === 'READY');
    else if (filterTab === 'on-order') items = items.filter(i => i.status === 'ON_ORDER');
    else if (filterTab === 'blocking') items = items.filter(i => i.status === 'BLOCKING');
    else if (filterTab === 'near-ready') items = items.filter(i => i.status === 'NEAR_READY');

    // Sort by coverage % ascending — least covered (most urgent) first
    return [...items].sort((a, b) => {
      const covA = a.requiredQty > 0 ? (a.onHandQty + a.onOrderQty) / a.requiredQty : 1;
      const covB = b.requiredQty > 0 ? (b.onHandQty + b.onOrderQty) / b.requiredQty : 1;
      return covA - covB;
    });
  }, [processedReadiness.items, filterTab]);

  // Group filtered items by vendor/company
  const groupedByVendor = useMemo(() => {
    const groups = new Map<string, { vendor: Vendor | null; items: typeof filteredItems }>();
    
    filteredItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const vendor = product?.vendorId ? vendors.find(v => v.id === product.vendorId) : null;
      const key = vendor?.id || '__unassigned__';
      
      if (!groups.has(key)) {
        groups.set(key, { vendor: vendor || null, items: [] });
      }
      groups.get(key)!.items.push(item);
    });

    // Sort: vendors with items first alphabetically, unassigned last
    return Array.from(groups.entries())
      .sort(([keyA, a], [keyB, b]) => {
        if (keyA === '__unassigned__') return 1;
        if (keyB === '__unassigned__') return -1;
        return (a.vendor?.name || '').localeCompare(b.vendor?.name || '');
      });
  }, [filteredItems, products, vendors]);

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

  // Calculate value-based metrics using normalized prices and actual purchase totals
  const valueMetrics = useMemo(() => {
    let onHandValue = 0;
    let onOrderValue = 0;
    let plannedValue = 0;

    // Build on-order value from actual purchase line totals
    const onOrderValueByProduct = new Map<string, number>();
    scopedPurchases.forEach(p => {
      (p.lines || []).forEach(line => {
        if (line.productId && line.totalPrice) {
          const current = onOrderValueByProduct.get(line.productId) || 0;
          onOrderValueByProduct.set(line.productId, current + line.totalPrice);
        }
      });
    });

    processedReadiness.items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      
      // On-hand value: inventory is in base units (gal/lbs/g)
      const inventoryPrice = getInventoryUnitPrice(product);
      onHandValue += item.onHandQty * inventoryPrice;
      
      // Use actual purchase totals for on-order value
      const actualOrderValue = onOrderValueByProduct.get(item.productId) || 0;
      onOrderValue += actualOrderValue;
      
      // Planned value: planned qty is in product's native unit
      const plannedPrice = getPlannedUnitPrice(product);
      plannedValue += item.requiredQty * plannedPrice;
    });

    const shortValue = Math.max(0, plannedValue - onHandValue - onOrderValue);
    const coveragePct = plannedValue > 0 
      ? Math.min(100, ((onHandValue + onOrderValue) / plannedValue) * 100)
      : 100;

    return { onHandValue, onOrderValue, plannedValue, shortValue, coveragePct };
  }, [processedReadiness.items, products, scopedPurchases]);

  // Value-based progress bar percentages
  const onHandPct = valueMetrics.plannedValue > 0 
    ? (valueMetrics.onHandValue / valueMetrics.plannedValue) * 100 
    : 0;
  const onOrderPct = valueMetrics.plannedValue > 0 
    ? (valueMetrics.onOrderValue / valueMetrics.plannedValue) * 100 
    : 0;
  // Ensure percentages don't exceed 100% total
  const cappedOnHandPct = Math.min(100, onHandPct);
  const cappedOnOrderPct = Math.min(100 - cappedOnHandPct, onOrderPct);
  const blockingPct = Math.max(0, 100 - cappedOnHandPct - cappedOnOrderPct);

  // Best price lookup for a product
  const getBestPrice = (productId: string): number | null => {
    const preferred = vendorOfferings.find(vo => vo.productId === productId && vo.isPreferred);
    if (preferred) return preferred.price;
    const any = vendorOfferings.find(vo => vo.productId === productId);
    if (any) return any.price;
    const pm = productMasters.find(p => p.id === productId);
    if (pm?.estimatedPrice) return pm.estimatedPrice;
    return null;
  };

  // Est. Still to Spend — sum of netNeeded × bestPrice for BLOCKING items only
  const estStillToSpend = useMemo(() => {
    let total = 0;
    let hasAnyPrice = false;
    processedReadiness.items.forEach(item => {
      if (item.status !== 'BLOCKING') return;
      const netNeeded = Math.max(0, item.requiredQty - item.onHandQty - item.onOrderQty);
      const price = getBestPrice(item.productId);
      if (price !== null && netNeeded > 0) {
        total += netNeeded * price;
        hasAnyPrice = true;
      }
    });
    return hasAnyPrice ? total : null;
  }, [processedReadiness.items, vendorOfferings, productMasters]);

  // Build timing bucket lookup for usage rows
  const timingNameToBucket = useMemo(() => {
    const m = new Map<string, TimingBucket>();
    if (!season) return m;
    season.crops.forEach(crop => {
      crop.applicationTimings.forEach(t => {
        m.set(`${crop.name}::${t.name}`, t.timingBucket || 'IN_SEASON');
      });
    });
    return m;
  }, [season]);

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Shared row renderer
  const renderProductRow = (item: typeof processedReadiness.items[0]) => {
    const p = statusPill(item.status);
    const usages = usageMap.get(item.productId) || [];
    const product = products.find(pr => pr.id === item.productId);
    const isExpanded = expandedRows.has(item.id);

    // Coverage calculations
    const coveragePct = item.requiredQty > 0
      ? Math.min(100, ((item.onHandQty + item.onOrderQty) / item.requiredQty) * 100)
      : 0;
    const onHandSegment = item.requiredQty > 0
      ? Math.min(100, (item.onHandQty / item.requiredQty) * 100)
      : 0;
    const onOrderSegment = Math.min(100 - onHandSegment, item.requiredQty > 0
      ? (item.onOrderQty / item.requiredQty) * 100
      : 0);

    // Cost calculation
    const netNeeded = Math.max(0, item.requiredQty - item.onHandQty - item.onOrderQty);
    const bestPrice = getBestPrice(item.productId);
    const estCost = bestPrice !== null && netNeeded > 0 ? netNeeded * bestPrice : null;

    return (
      <div key={item.id}>
        <div className="grid grid-cols-12 px-5 py-4 text-sm text-stone-800 hover:bg-stone-50">
          <div className="col-span-3">
            <div className="flex items-center gap-2">
              {/* Expand chevron */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleRowExpand(item.id); }}
                className="p-0.5 rounded hover:bg-stone-200 text-stone-400 flex-shrink-0"
              >
                {isExpanded
                  ? <ChevronDown className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />
                }
              </button>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                product?.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'
              }`}>
                {product?.form === 'liquid' 
                  ? <Droplets className="w-5 h-5 text-blue-600" /> 
                  : <Weight className="w-5 h-5 text-amber-600" />}
              </div>
              <div className="min-w-0">
                <div className="font-semibold">{item.label}</div>
                {productTimingBucket.get(item.productId) && (() => {
                  const bucket = productTimingBucket.get(item.productId)!;
                  const badge = BUCKET_BADGE[bucket];
                  return (
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  );
                })()}
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${p.cls}`}>
                    <p.icon className="w-3.5 h-3.5" />
                    {p.label}
                  </span>
                  <span className="text-[11px] font-medium text-stone-600">
                    {Math.round(coveragePct)}% covered
                  </span>
                </div>
                {/* Coverage progress bar */}
                <div className="mt-1.5 h-1.5 w-full max-w-[180px] rounded-full bg-stone-200 overflow-hidden flex">
                  {onHandSegment > 0 && (
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${onHandSegment}%` }} />
                  )}
                  {onOrderSegment > 0 && (
                    <div className="h-full bg-amber-400 transition-all" style={{ width: `${onOrderSegment}%` }} />
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-2 flex items-center">{fmt(item.requiredQty)} {item.plannedUnit}</div>
          <div className="col-span-1 flex items-center">{fmt(item.onHandQty)} {item.plannedUnit}</div>
          <div className="col-span-2 flex items-center">{fmt(item.onOrderQty)} {item.plannedUnit}</div>
          <div className="col-span-1 flex items-center text-right">
            {estCost !== null ? (
              <span className="text-rose-600 font-medium">{formatCurrency(estCost)}</span>
            ) : netNeeded > 0 ? (
              <span className="text-stone-400 text-xs">— no price</span>
            ) : (
              <span className="text-emerald-600 text-xs">Covered</span>
            )}
          </div>
          <div className="col-span-3 flex justify-end items-center gap-2">
            {item.status === 'BLOCKING' && (
              <button
                onClick={() => handleQuickAdd(item.productId, item.shortQty)}
                className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100"
              >
                Add {fmt(item.shortQty, 0)}
              </button>
            )}
            {item.status === 'BLOCKING' && onNavigateToPurchases && (
              <button
                onClick={onNavigateToPurchases}
                className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
              >
                Buy →
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
        {/* Inline crop breakdown */}
        {isExpanded && usages.length > 0 && (
          <div className="px-5 pb-4 pl-20 space-y-1 animate-in slide-in-from-top-1 duration-200">
            {usages.map((u, idx) => {
              const bucketKey = `${u.cropName}::${u.timingName}`;
              const bucket = timingNameToBucket.get(bucketKey);
              const bucketLabel = bucket ? BUCKET_BADGE[bucket].label : u.timingName;
              return (
                <div key={idx} className="flex items-center justify-between text-xs text-stone-600 py-1 border-b border-stone-100 last:border-0">
                  <span>{u.cropName} — <span className="font-medium">{bucketLabel}</span></span>
                  <span className="font-mono">{fmt(u.quantityNeeded)} {item.plannedUnit}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="px-5 py-12 text-center">
      <Package className="w-12 h-12 text-stone-300 mx-auto mb-4" />
      <h3 className="font-semibold text-stone-800 mb-2">No items in this category</h3>
      <p className="text-stone-500">
        {filterTab === 'blocking' && 'Great news! No items are blocking plan execution.'}
        {filterTab === 'near-ready' && 'No items are near ready (≥95% covered).'}
        {filterTab === 'on-order' && 'No items are currently on order.'}
        {filterTab === 'ready' && 'No items are fully covered yet.'}
        {filterTab === 'all' && 'Add products to your crop plans to see readiness status.'}
      </p>
    </div>
  );

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
        <div className="grid grid-cols-5 gap-4 mt-6">
          <div className="bg-stone-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-stone-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">{processedReadiness.totalCount}</p>
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
                <p className="text-2xl font-bold text-emerald-600">{processedReadiness.readyCount}</p>
                <p className="text-sm text-stone-500">Ready</p>
              </div>
            </div>
          </div>

          <div className="bg-sky-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-sky-600">{processedReadiness.nearReadyCount}</p>
                <p className="text-sm text-stone-500">Near Ready</p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{processedReadiness.onOrderCount}</p>
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
                <p className="text-2xl font-bold text-rose-600">{processedReadiness.blockingCount}</p>
                <p className="text-sm text-stone-500">Need to Order</p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-5 gap-4 mt-4">
          {/* Est. Still to Spend — most important number */}
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-rose-600">
                  {estStillToSpend !== null ? formatCurrency(estStillToSpend) : '—'}
                </p>
                <p className="text-xs text-stone-500">Est. Still to Spend</p>
              </div>
            </div>
          </div>
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
            <span>{Math.round(cappedOnHandPct)}% on hand</span>
          </div>
          <div className="h-3 bg-stone-100 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 transition-all" style={{ width: `${cappedOnHandPct}%` }} />
            <div className="bg-amber-500 transition-all" style={{ width: `${cappedOnOrderPct}%` }} />
            <div className="bg-rose-500 transition-all" style={{ width: `${blockingPct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="text-stone-600">On Hand ({Math.round(cappedOnHandPct)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full" />
              <span className="text-stone-600">Ordered ({Math.round(cappedOnOrderPct)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-rose-500 rounded-full" />
              <span className="text-stone-600">To Go ({Math.round(blockingPct)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order by Vendor — only when there are blocking items */}
      {processedReadiness.blockingCount > 0 && (() => {
        const blockingItems = processedReadiness.items.filter(i => i.status === 'BLOCKING');
        const vendorGroups = new Map<string, { vendorName: string; items: typeof blockingItems; totalCost: number }>();

        blockingItems.forEach(item => {
          const preferred = vendorOfferings.find(vo => vo.productId === item.productId && vo.isPreferred);
          const anyOffering = preferred || vendorOfferings.find(vo => vo.productId === item.productId);
          const vendor = anyOffering ? vendors.find(v => v.id === anyOffering.vendorId) : null;
          const key = vendor?.id || '__none__';
          const vendorName = vendor?.name || 'No Vendor Assigned';

          if (!vendorGroups.has(key)) {
            vendorGroups.set(key, { vendorName, items: [], totalCost: 0 });
          }
          const group = vendorGroups.get(key)!;
          group.items.push(item);
          const netNeeded = Math.max(0, item.requiredQty - item.onHandQty - item.onOrderQty);
          const price = getBestPrice(item.productId);
          if (price !== null) group.totalCost += netNeeded * price;
        });

        const groups = Array.from(vendorGroups.entries())
          .filter(([key, g]) => key !== '__none__' || g.items.length > 0)
          .sort(([a], [b]) => a === '__none__' ? 1 : b === '__none__' ? -1 : 0);

        const allUnassigned = groups.length === 1 && groups[0][0] === '__none__';

        return (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
            <h3 className="font-semibold text-stone-800 mb-3">Order by Vendor</h3>
            {allUnassigned ? (
              <p className="text-sm text-stone-400">Assign vendors to your products to use order consolidation.</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {groups.map(([key, group]) => (
                  <div key={key} className="border border-stone-200 rounded-xl p-4 min-w-[240px] max-w-[320px] flex-1">
                    <div className="font-semibold text-stone-800">{group.vendorName}</div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {group.items.length} product{group.items.length !== 1 ? 's' : ''} need ordering
                    </p>
                    {group.totalCost > 0 && (
                      <p className="text-sm font-bold text-rose-600 mt-1">{formatCurrency(group.totalCost)}</p>
                    )}
                    <div className="mt-2 space-y-1">
                      {group.items.map(item => {
                        const net = Math.max(0, item.requiredQty - item.onHandQty - item.onOrderQty);
                        return (
                          <div key={item.id} className="flex justify-between text-xs text-stone-600">
                            <span className="truncate">{item.label}</span>
                            <span className="font-mono ml-2 flex-shrink-0">{fmt(net)} {item.plannedUnit}</span>
                          </div>
                        );
                      })}
                    </div>
                    {key !== '__none__' && onNavigateToPurchases && (
                      <button
                        onClick={onNavigateToPurchases}
                        className="mt-3 w-full px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                      >
                        Build Order →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Filter Tabs + View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
        {([
            { id: 'all', label: 'All', count: processedReadiness.totalCount },
            { id: 'blocking', label: 'Need to Order', count: processedReadiness.blockingCount },
            { id: 'near-ready', label: 'Near Ready', count: processedReadiness.nearReadyCount },
            { id: 'on-order', label: 'Ordered', count: processedReadiness.onOrderCount },
            { id: 'ready', label: 'Ready', count: processedReadiness.readyCount },
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

        <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('product')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'product' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            By Product
          </button>
          <button
            onClick={() => setViewMode('company')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              viewMode === 'company' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            By Company
          </button>
        </div>
      </div>

      {/* Main Table */}
      {viewMode === 'product' ? (
        /* ── Flat product list ── */
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="grid grid-cols-12 bg-stone-50 px-5 py-3 text-xs font-semibold text-stone-600">
            <div className="col-span-3">Product</div>
            <div className="col-span-2">Need</div>
            <div className="col-span-1">On Hand</div>
            <div className="col-span-2">On Order</div>
            <div className="col-span-1">Est. Cost</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          <div className="divide-y divide-stone-200">
            {filteredItems.map(item => renderProductRow(item))}
            {filteredItems.length === 0 && renderEmptyState()}
          </div>
        </div>
      ) : (
        /* ── Grouped by company ── */
        <div className="space-y-4">
          {groupedByVendor.map(([key, group]) => {
            const vendorName = group.vendor?.name || 'No Vendor Assigned';
            const vendorContact = group.vendor?.contactEmail || group.vendor?.contactPhone || '';
            const groupBlocking = group.items.filter(i => i.status === 'BLOCKING').length;
            const groupOrdered = group.items.filter(i => i.status === 'ON_ORDER').length;
            const groupReady = group.items.filter(i => i.status === 'READY').length;

            return (
              <div key={key} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                {/* Vendor header */}
                <div className="bg-stone-50 px-5 py-4 border-b border-stone-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-stone-200 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-stone-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-800">{vendorName}</h3>
                        {vendorContact && <p className="text-xs text-stone-500">{vendorContact}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="text-stone-500">{group.items.length} product{group.items.length !== 1 ? 's' : ''}</span>
                      {groupReady > 0 && <span className="text-emerald-600">{groupReady} ready</span>}
                      {groupOrdered > 0 && <span className="text-amber-600">{groupOrdered} ordered</span>}
                      {groupBlocking > 0 && <span className="text-rose-600">{groupBlocking} need to order</span>}
                    </div>
                  </div>
                </div>

                {/* Product rows */}
                <div className="grid grid-cols-12 bg-stone-50/50 px-5 py-2 text-xs font-semibold text-stone-500">
                  <div className="col-span-3">Product</div>
                  <div className="col-span-2">Need</div>
                  <div className="col-span-1">On Hand</div>
                  <div className="col-span-2">On Order</div>
                  <div className="col-span-1">Est. Cost</div>
                  <div className="col-span-3 text-right">Actions</div>
                </div>
                <div className="divide-y divide-stone-100">
                  {group.items.map(item => renderProductRow(item))}
                </div>
              </div>
            );
          })}

          {groupedByVendor.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              {renderEmptyState()}
            </div>
          )}
        </div>
      )}

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
