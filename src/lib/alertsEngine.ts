// ============================================================================
// Alerts Engine - Generates operational alerts from readiness, orders, invoices
// ============================================================================

import type { Season, Product, InventoryItem } from '@/types/farm';
import type { Order, Invoice } from '@/types/orderInvoice';
import type { PriceBookEntry } from '@/types';
import { calculatePlannedUsage } from '@/lib/calculations';
import { computeReadiness, type PlannedUsage } from '@/lib/readinessEngine';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertType =
  | 'SHORTFALL_BLOCKING'
  | 'ORDER_OVERDUE'
  | 'PRICE_SPIKE'
  | 'MISSING_PLANNED_PRICE'
  | 'INVOICE_MISSING_FOR_RECEIPT';

export type AppAlert = {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  detail?: string;
  ts: string; // ISO
  action?: { label: string; view: string };
  meta?: Record<string, any>;
};

const toNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

function safeId(prefix: string) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function daysBetween(aIso: string, bIso: string) {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

function normalizeUom(u?: string) {
  const x = (u || '').toLowerCase();
  if (x === 'lb' || x === 'lbs') return 'lbs';
  if (x === 'ton' || x === 'tons') return 'ton';
  if (x === 'gal' || x === 'gallon' || x === 'gallons') return 'gal';
  return u || '';
}

function getPlannedPrice(productId: string, seasonYear: number, priceBook: PriceBookEntry[]) {
  // planned price must NOT use invoice sources
  const candidates = (priceBook || []).filter(e =>
    e.seasonYear === seasonYear &&
    e.productId === productId &&
    e.source !== 'invoice'
  );

  const rank = (src?: string) => {
    switch (src) {
      case 'manual_override': return 0;
      case 'manual': return 1;
      case 'awarded': return 2;
      case 'estimated': return 3;
      default: return 9;
    }
  };

  candidates.sort((a, b) => rank(a.source) - rank(b.source));
  return candidates[0] || null;
}

export function buildAlerts(opts: {
  season: Season | null;
  products: Product[];
  inventory: InventoryItem[];
  orders: Order[];
  invoices: Invoice[];
  priceBook: PriceBookEntry[];
  overdueDays?: number;
  priceSpikePct?: number;
}): AppAlert[] {
  const {
    season,
    products,
    inventory,
    orders,
    invoices,
    priceBook,
  } = opts;

  const overdueDays = opts.overdueDays ?? 21;
  const priceSpikePct = opts.priceSpikePct ?? 15;

  const nowIso = new Date().toISOString();
  const seasonYear = season?.year || new Date().getFullYear();

  const alerts: AppAlert[] = [];

  // ---- A) Blocking shortfalls (trust engine)
  const plannedUsage = calculatePlannedUsage(season, products);

  const plannedForEngine: PlannedUsage[] = (plannedUsage || []).map((u: any) => {
    const p = products.find(x => x.id === u.productId);
    return {
      id: u.productId,
      label: p?.name || 'Unknown product',
      productId: u.productId,
      requiredQty: toNum(u.totalNeeded),
      plannedUnit: u.unit,
      crop: u.usages?.[0]?.cropName,
      passName: u.usages?.[0]?.timingName,
    };
  });

  const readiness = computeReadiness({
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
      getVendorName: (o: Order) => undefined,
      getLines: (o: Order) => o.lineItems || [],
      getLineProductId: (l: any) => l.productId,
      getLineRemainingQty: (l: any) =>
        l.remainingQuantity ?? (toNum(l.orderedQuantity) - toNum(l.receivedQuantity)),
      getLineUnit: (l: any) => l.unit,
    },
  });

  const blocking = readiness.items.filter(i => i.status === 'BLOCKING' && i.shortQty > 0);
  if (blocking.length) {
    alerts.push({
      id: safeId('alert'),
      ts: nowIso,
      severity: 'critical',
      type: 'SHORTFALL_BLOCKING',
      title: `Blocking shortfalls: ${blocking.length} item(s)`,
      detail: `Top: ${blocking.slice(0, 3).map(b => `${b.label} (${Math.round(b.shortQty)} ${b.plannedUnit})`).join(', ')}`,
      action: { label: 'Open Plan Readiness', view: 'plan-readiness' },
      meta: { count: blocking.length },
    });
  }

  // ---- B) Missing planned price for planned products
  const plannedProductIds = new Set(plannedUsage.map((u: any) => u.productId));
  let missingPriceCount = 0;

  for (const pid of plannedProductIds) {
    const planned = getPlannedPrice(pid, seasonYear, priceBook);
    if (!planned) missingPriceCount++;
  }

  if (missingPriceCount) {
    alerts.push({
      id: safeId('alert'),
      ts: nowIso,
      severity: missingPriceCount > 5 ? 'warning' : 'info',
      type: 'MISSING_PLANNED_PRICE',
      title: `Missing planned price: ${missingPriceCount} product(s)`,
      detail: `Planned cost/variance will be incomplete until price book entries exist.`,
      action: { label: 'Open Price Book', view: 'price-book' },
      meta: { count: missingPriceCount },
    });
  }

  // ---- C) Overdue open orders
  const openOrders = (orders || []).filter(o =>
    ['draft', 'ordered', 'confirmed', 'partial'].includes(String(o.status || 'draft')) &&
    (o.lineItems || []).some(li => toNum(li.remainingQuantity) > 0)
  );

  const overdue = openOrders.filter(o => {
    const base = o.orderDate ? `${o.orderDate}T00:00:00Z` : (o.createdAt || nowIso);
    return daysBetween(base, nowIso) >= overdueDays;
  });

  if (overdue.length) {
    alerts.push({
      id: safeId('alert'),
      ts: nowIso,
      severity: 'warning',
      type: 'ORDER_OVERDUE',
      title: `Overdue orders: ${overdue.length}`,
      detail: `Oldest: ${overdue
        .sort((a, b) => (a.orderDate || '').localeCompare(b.orderDate || ''))[0]?.orderNumber || '—'
      }`,
      action: { label: 'Open Orders', view: 'orders' },
      meta: { count: overdue.length, overdueDays },
    });
  }

  // ---- D) Price spike: invoice landed vs planned price
  let spikeCount = 0;
  for (const inv of invoices || []) {
    if (inv.seasonYear !== seasonYear) continue;
    for (const li of inv.lineItems || []) {
      const pid = li.productId;
      if (!pid) continue;

      const landed = toNum(li.landedUnitCost);
      const unit = normalizeUom(li.unit);
      if (!(landed > 0)) continue;

      const planned = getPlannedPrice(pid, seasonYear, priceBook);
      if (!planned) continue;

      const plannedUom = normalizeUom((planned.priceUom as any) || '');
      if (!plannedUom || plannedUom !== unit) continue;

      const plannedPrice = toNum(planned.price);
      if (!(plannedPrice > 0)) continue;

      const pct = ((landed - plannedPrice) / plannedPrice) * 100;
      if (pct >= priceSpikePct) spikeCount++;
    }
  }

  if (spikeCount) {
    alerts.push({
      id: safeId('alert'),
      ts: nowIso,
      severity: 'warning',
      type: 'PRICE_SPIKE',
      title: `Landed cost spike detected (${spikeCount} line item(s))`,
      detail: `Invoice landed cost is ≥ ${priceSpikePct}% above planned price (same unit only).`,
      action: { label: 'Open Variance', view: 'variance' },
      meta: { count: spikeCount, priceSpikePct },
    });
  }

  // ---- E) Orders received (partial/complete) without invoice recorded
  const receivedOrders = (orders || []).filter(o =>
    ['partial', 'complete'].includes(String(o.status || '')) &&
    ((o.invoiceIds || []).length === 0)
  );

  if (receivedOrders.length) {
    alerts.push({
      id: safeId('alert'),
      ts: nowIso,
      severity: 'info',
      type: 'INVOICE_MISSING_FOR_RECEIPT',
      title: `Received orders missing invoice: ${receivedOrders.length}`,
      detail: `Recording invoices updates landed cost + price book.`,
      action: { label: 'Open Orders', view: 'orders' },
      meta: { count: receivedOrders.length },
    });
  }

  // newest first
  alerts.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  return alerts;
}
