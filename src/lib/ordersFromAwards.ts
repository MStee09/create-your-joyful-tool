// ============================================================================
// Converts bid event awards into draft orders, grouped by vendor
// ============================================================================

import type { Order, OrderLineItem } from '@/types/orderInvoice';
import type { Award, VendorQuote, CommoditySpec } from '@/types';

function safeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function nextOrderNumber(existing: Order[], seasonYear: number): string {
  const prefix = `ORD-${seasonYear}-`;
  const nums = (existing || [])
    .map(o => o.orderNumber || '')
    .filter(n => n.startsWith(prefix))
    .map(n => Number(n.replace(prefix, '')))
    .filter(x => Number.isFinite(x));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export interface BuildDraftOrdersResult {
  orders: Order[];
  warnings: string[];
}

export function buildDraftOrdersFromAwards(opts: {
  bidEventId: string;
  seasonYear: number;
  awards: Award[];
  vendorQuotes: VendorQuote[];
  commoditySpecs: CommoditySpec[];
  existingOrders: Order[];
}): BuildDraftOrdersResult {
  const { bidEventId, seasonYear, awards, vendorQuotes, commoditySpecs, existingOrders } = opts;

  const warnings: string[] = [];
  const nowIso = new Date().toISOString();
  const orderDate = nowIso.slice(0, 10);

  // Group awards by vendor
  const byVendor = new Map<string, Award[]>();
  for (const a of awards) {
    if (!a.vendorId) {
      warnings.push(`Award missing vendorId for specId=${a.specId}`);
      continue;
    }
    if (!byVendor.has(a.vendorId)) byVendor.set(a.vendorId, []);
    byVendor.get(a.vendorId)!.push(a);
  }

  const created: Order[] = [];
  let workingOrders = [...(existingOrders || [])];

  for (const [vendorId, vendorAwards] of byVendor.entries()) {
    const orderNumber = nextOrderNumber(workingOrders, seasonYear);

    const lineItems: OrderLineItem[] = vendorAwards.map((a) => {
      const specId = a.specId || '';
      const spec = commoditySpecs.find(s => s.id === specId);

      // Resolve productId:
      // - if award is for a commoditySpec, use spec.productId (if present)
      // - else treat specId as productId
      const productId = (spec as any)?.productId || specId;

      // Resolve unit price: prefer awardedPrice, fallback to quote price
      const quote = vendorQuotes.find(q => q.id === a.vendorQuoteId) ||
                    vendorQuotes.find(q => q.vendorId === vendorId && (q.specId === specId || q.commoditySpecId === specId));

      const unitPrice = Number.isFinite(a.awardedPrice as number)
        ? Number(a.awardedPrice)
        : Number.isFinite(quote?.price as number)
          ? Number(quote!.price)
          : 0;

      if (unitPrice <= 0) warnings.push(`Missing price for vendor=${vendorId} specId=${specId}`);

      const orderedQuantity = Number.isFinite(a.quantity) ? Number(a.quantity) : 0;
      if (orderedQuantity <= 0) warnings.push(`Missing quantity for vendor=${vendorId} specId=${specId}`);

      const unit = (quote?.priceUom || (spec as any)?.uom || 'ton') as string;

      return {
        id: safeId(),
        productId,
        commoditySpecId: specId,
        orderedQuantity,
        unit,
        unitPrice,
        totalPrice: orderedQuantity * unitPrice,
        receivedQuantity: 0,
        remainingQuantity: orderedQuantity,
        status: 'pending' as const,
      };
    });

    const subtotal = lineItems.reduce((s, li) => s + (li.totalPrice || 0), 0);

    const order: Order = {
      id: safeId(),
      orderNumber,
      vendorId,
      seasonYear,
      orderDate,
      createdAt: nowIso,
      updatedAt: nowIso,
      lineItems,
      subtotal,
      status: 'draft',
      paymentStatus: 'unpaid',
      invoiceIds: [],
      bidEventId,
      bidAwardDate: nowIso,
      notes: 'Created from bid awards',
    };

    created.push(order);
    workingOrders = [...workingOrders, order];
  }

  return { orders: created, warnings };
}
