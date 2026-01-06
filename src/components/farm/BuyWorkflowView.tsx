// ============================================================================
// BuyWorkflowView - Guided Buy Workflow: Demand → Quotes → Award → Orders
// ============================================================================

import React, { useMemo, useState } from 'react';
import { CheckCircle, ClipboardList, ShoppingCart, Truck, AlertTriangle, ArrowRight } from 'lucide-react';
import type { Season, Product, Vendor, InventoryItem } from '@/types/farm';
import type { Order, OrderLineItem } from '@/types/orderInvoice';
import { calculatePlannedUsage, type PlannedUsageItem } from '@/lib/calculations';
import { computeReadiness, type PlannedUsage, type ReadinessItem } from '@/lib/readinessEngine';

type Step = 'demand' | 'quotes' | 'award' | 'orders';

function fmt(n: number, decimals = 1) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function safeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function nextOrderNumber(existing: Order[], seasonYear: number) {
  const prefix = `ORD-${seasonYear}-`;
  const nums = existing
    .map(o => o.orderNumber || '')
    .filter(n => n.startsWith(prefix))
    .map(n => Number(n.replace(prefix, '')))
    .filter(x => Number.isFinite(x));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

interface BuyWorkflowViewProps {
  season: Season | null;
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  orders: Order[];
  onAddOrder: (order: Order) => Promise<void> | void;
  onNavigate: (viewId: string) => void;
}

export const BuyWorkflowView: React.FC<BuyWorkflowViewProps> = ({
  season,
  products,
  vendors,
  inventory,
  orders,
  onAddOrder,
  onNavigate,
}) => {
  const [step, setStep] = useState<Step>('demand');
  const [onlyBlocking, setOnlyBlocking] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);

  const plannedUsage = useMemo(() => calculatePlannedUsage(season, products), [season, products]);

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

  const readiness = useMemo(() => {
    return computeReadiness({
      planned: plannedForEngine,
      inventory,
      orders,
      inventoryAccessors: {
        getProductId: (row: InventoryItem) => row.productId,
        getQty: (row: InventoryItem) => row.quantity,
        getContainerCount: (row: InventoryItem) => row.containerCount,
      },
      orderAccessors: {
        orders,
        getOrderId: (o: Order) => o.id,
        getOrderStatus: (o: Order) => o.status,
        getVendorName: (o: Order) => vendors.find(v => v.id === o.vendorId)?.name ?? undefined,
        getLines: (o: Order) => o.lineItems || [],
        getLineProductId: (l: any) => l.productId,
        getLineRemainingQty: (l: any) =>
          l.remainingQuantity ?? (Number(l.orderedQuantity || 0) - Number(l.receivedQuantity || 0)),
        getLineUnit: (l: any) => l.unit,
      },
    });
  }, [plannedForEngine, inventory, orders, vendors]);

  const demandItems = useMemo(() => {
    const base = readiness.items;
    const filtered = onlyBlocking ? base.filter(i => i.status === 'BLOCKING') : base;
    return [...filtered].sort((a, b) => {
      const rank = (s: string) => (s === 'BLOCKING' ? 0 : s === 'ON_ORDER' ? 1 : 2);
      return rank(a.status) - rank(b.status);
    });
  }, [readiness.items, onlyBlocking]);

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const estimatedShortCost = useMemo(() => {
    let total = 0;
    for (const item of demandItems) {
      if (item.shortQty <= 0) continue;
      const prod = products.find(p => p.id === item.productId);
      const unitPrice = prod?.price ?? 0;
      total += item.shortQty * unitPrice;
    }
    return total;
  }, [demandItems, products]);

  async function createDraftOrders() {
    setIsCreating(true);
    try {
      const selectedItems = demandItems.filter(i => selected[i.productId] && i.shortQty > 0);
      if (selectedItems.length === 0) return;

      const seasonYear = season?.year || new Date().getFullYear();
      const groups = new Map<string, ReadinessItem[]>();

      for (const item of selectedItems) {
        const prod = products.find(p => p.id === item.productId);
        const vendorId = prod?.vendorId || 'unknown';
        if (!groups.has(vendorId)) groups.set(vendorId, []);
        groups.get(vendorId)!.push(item);
      }

      for (const [vendorId, items] of groups.entries()) {
        const orderNumber = nextOrderNumber(orders, seasonYear);
        const now = new Date();
        const iso = now.toISOString();

        const lineItems: OrderLineItem[] = items.map((it) => {
          const prod = products.find(p => p.id === it.productId);
          const unitPrice = prod?.price ?? 0;
          const orderedQuantity = it.shortQty;

          return {
            id: safeId(),
            productId: it.productId,
            orderedQuantity,
            unit: String(it.plannedUnit),
            unitPrice,
            totalPrice: orderedQuantity * unitPrice,
            receivedQuantity: 0,
            remainingQuantity: orderedQuantity,
            status: 'pending',
          };
        });

        const subtotal = lineItems.reduce((s, li) => s + (li.totalPrice || 0), 0);

        const order: Order = {
          id: safeId(),
          orderNumber,
          vendorId,
          seasonYear,
          orderDate: iso.slice(0, 10),
          createdAt: iso,
          updatedAt: iso,
          lineItems,
          subtotal,
          status: 'draft',
          paymentStatus: 'unpaid',
          invoiceIds: [],
          notes: 'Created from Buy Workflow (Demand → Draft Order)',
        };

        await onAddOrder(order);
      }

      setSelected({});
      setStep('orders');
      onNavigate('orders');
    } finally {
      setIsCreating(false);
    }
  }

  const StepButton = ({ id, label, icon: Icon }: { id: Step; label: string; icon: React.ElementType }) => {
    const active = step === id;
    return (
      <button
        onClick={() => setStep(id)}
        className={
          'flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ' +
          (active ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50')
        }
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>
    );
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Buy Workflow</h2>
          <p className="text-sm text-stone-500 mt-1">
            Guided flow: Demand → Quotes → Award → Orders
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <StepButton id="demand" label="Demand" icon={ClipboardList} />
          <StepButton id="quotes" label="Quotes" icon={Truck} />
          <StepButton id="award" label="Award" icon={CheckCircle} />
          <StepButton id="orders" label="Orders" icon={ShoppingCart} />
        </div>
      </div>

      {step === 'demand' && (
        <div className="space-y-4">
          {/* Metrics */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="text-xs font-semibold text-stone-500">Blocking</div>
              <div className="mt-1 text-2xl font-semibold text-rose-600">{readiness.blockingCount}</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="text-xs font-semibold text-stone-500">On Order</div>
              <div className="mt-1 text-2xl font-semibold text-amber-600">{readiness.onOrderCount}</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="text-xs font-semibold text-stone-500">Ready</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-600">{readiness.readyCount}</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="text-xs font-semibold text-stone-500">Est. Short Cost</div>
              <div className="mt-1 text-2xl font-semibold text-stone-900">${fmt(estimatedShortCost, 0)}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={onlyBlocking}
                onChange={(e) => setOnlyBlocking(e.target.checked)}
                className="rounded"
              />
              Show only blocking items
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const next: Record<string, boolean> = {};
                  for (const it of demandItems) {
                    if (it.shortQty > 0) next[it.productId] = true;
                  }
                  setSelected(next);
                }}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-stone-50"
              >
                Select all shortfalls
              </button>

              <button
                disabled={selectedCount === 0 || isCreating}
                onClick={createDraftOrders}
                className="rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating…' : `Create Draft Orders (${selectedCount})`}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
            <div className="grid grid-cols-12 bg-stone-50 px-5 py-3 text-xs font-semibold text-stone-600">
              <div className="col-span-1"></div>
              <div className="col-span-3">Item</div>
              <div className="col-span-2">Vendor</div>
              <div className="col-span-2">Need</div>
              <div className="col-span-1">On Hand</div>
              <div className="col-span-1">On Order</div>
              <div className="col-span-2 text-right">Short</div>
            </div>

            <div className="divide-y divide-stone-200">
              {demandItems.map((it) => {
                const prod = products.find(p => p.id === it.productId);
                const vendor = vendors.find(v => v.id === prod?.vendorId);
                const canBuy = it.shortQty > 0;

                const statusPill =
                  it.status === 'READY'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : it.status === 'ON_ORDER'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200';

                const StatusIcon =
                  it.status === 'READY'
                    ? CheckCircle
                    : it.status === 'ON_ORDER'
                      ? Truck
                      : AlertTriangle;

                const statusLabel =
                  it.status === 'READY' ? 'Ready' : it.status === 'ON_ORDER' ? 'On Order' : 'Blocking';

                return (
                  <div key={it.productId} className="grid grid-cols-12 px-5 py-4 text-sm text-stone-800 hover:bg-stone-50">
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        disabled={!canBuy}
                        checked={!!selected[it.productId]}
                        onChange={(e) => setSelected(prev => ({ ...prev, [it.productId]: e.target.checked }))}
                        className="rounded"
                      />
                    </div>

                    <div className="col-span-3">
                      <div className="font-semibold">{it.label}</div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${statusPill}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusLabel}
                        </span>
                        {(it.crop || it.passName) && (
                          <span className="text-xs text-stone-500">
                            {it.crop}{it.passName ? ` • ${it.passName}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center text-stone-600">{vendor?.name || '—'}</div>
                    <div className="col-span-2 flex items-center">{fmt(it.requiredQty)} {it.plannedUnit}</div>
                    <div className="col-span-1 flex items-center">{fmt(it.onHandQty)}</div>
                    <div className="col-span-1 flex items-center">{fmt(it.onOrderQty)}</div>
                    <div className="col-span-2 flex items-center justify-end font-semibold">
                      {it.shortQty > 0 ? (
                        <span className="text-rose-600">{fmt(it.shortQty)} {it.plannedUnit}</span>
                      ) : (
                        <span className="text-emerald-600">—</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {demandItems.length === 0 && (
                <div className="px-5 py-10 text-center text-stone-500">
                  {onlyBlocking ? 'No blocking items. Uncheck the filter to see all demand.' : 'No demand items found.'}
                </div>
              )}
            </div>
          </div>

          {/* Next step prompt */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-stone-900">Next: Quotes</div>
              <div className="text-stone-600">Use Bid Events to collect vendor pricing, then compare and award.</div>
            </div>
            <button
              onClick={() => setStep('quotes')}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50"
            >
              Go to Quotes <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'quotes' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-3">
          <h3 className="text-lg font-semibold text-stone-900">Quotes</h3>
          <p className="text-sm text-stone-600">
            Use Bid Events to request and collect vendor pricing. This will be unified into this workflow in a future update.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onNavigate('bid-events')}
              className="rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
            >
              Go to Bid Events
            </button>
            <button
              onClick={() => setStep('award')}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50"
            >
              Next: Award
            </button>
          </div>
        </div>
      )}

      {step === 'award' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-3">
          <h3 className="text-lg font-semibold text-stone-900">Award</h3>
          <p className="text-sm text-stone-600">
            Select winners and update pricing in the Price Book. This will be integrated into the workflow in a future update.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onNavigate('price-book')}
              className="rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
            >
              Go to Price Book
            </button>
            <button
              onClick={() => setStep('orders')}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50"
            >
              Next: Orders
            </button>
          </div>
        </div>
      )}

      {step === 'orders' && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-3">
          <h3 className="text-lg font-semibold text-stone-900">Orders</h3>
          <p className="text-sm text-stone-600">
            View, confirm, and receive your orders. Draft orders created from Demand will appear here.
          </p>
          <button
            onClick={() => onNavigate('orders')}
            className="rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
          >
            Open Orders
          </button>
        </div>
      )}
    </div>
  );
};
