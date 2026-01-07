// ============================================================================
// PHASE 2.3A: Invoice Operations
// ============================================================================
// Builds invoices from modal data, updates orders, inventory, and price book
// ============================================================================

import type { Order, OrderLineItem, Invoice, InvoiceLineItem, InvoiceCharge } from '@/types/orderInvoice';
import type { PriceBookEntry } from '@/types';
import { allocateFreight } from '@/types/orderInvoice';

function safeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Build an Invoice object from the modal form data
 */
export function buildInvoiceFromModal(opts: {
  seasonYear: number;
  vendorId: string;
  order?: Order | null;
  invoiceNumber: string;
  invoiceDate: string;
  receivedDate: string;
  lineItems: Array<{
    orderLineItemId: string;
    productId: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    scaleTicket?: string;
  }>;
  charges: Array<{
    type: string;
    description?: string;
    amount: number;
  }>;
}): Invoice {
  const {
    seasonYear,
    vendorId,
    order,
    invoiceNumber,
    invoiceDate,
    receivedDate,
    lineItems,
    charges,
  } = opts;

  const nowIso = new Date().toISOString();

  // Build invoice line items
  const invoiceLineItems: InvoiceLineItem[] = lineItems.map((li) => {
    const subtotal = Number(li.quantity || 0) * Number(li.unitPrice || 0);
    return {
      id: safeId(),
      productId: li.productId,
      orderLineItemId: li.orderLineItemId,
      quantity: Number(li.quantity || 0),
      unit: li.unit,
      scaleTicket: li.scaleTicket,
      unitPrice: Number(li.unitPrice || 0),
      subtotal,
      allocatedFreight: 0,
      landedUnitCost: 0,
      landedTotal: 0,
    };
  });

  // Build charges
  const invoiceCharges: InvoiceCharge[] = (charges || [])
    .filter(c => Number(c.amount || 0) !== 0)
    .map(c => ({
      id: safeId(),
      type: (c.type as any) || 'freight',
      description: c.description,
      amount: Number(c.amount || 0),
    }));

  const productSubtotal = invoiceLineItems.reduce((s, x) => s + (x.subtotal || 0), 0);
  const chargesTotal = invoiceCharges.reduce((s, x) => s + (x.amount || 0), 0);
  const totalAmount = productSubtotal + chargesTotal;

  // Allocate freight/charges into landed cost
  const allocated = allocateFreight(invoiceLineItems, chargesTotal);

  return {
    id: safeId(),
    invoiceNumber,
    vendorId,
    seasonYear,
    invoiceDate,
    receivedDate,
    createdAt: nowIso,
    orderId: order?.id,
    lineItems: allocated,
    productSubtotal,
    charges: invoiceCharges,
    chargesTotal,
    totalAmount,
    status: 'received',
    scaleTickets: allocated.map(x => x.scaleTicket).filter(Boolean) as string[],
    notes: `Recorded from Orders`,
  };
}

/**
 * Apply an invoice to an order: update received/remaining quantities and status
 */
export function applyInvoiceToOrder(order: Order, invoice: Invoice): Order {
  const lineDelta = new Map<string, number>(); // orderLineItemId -> qty received
  for (const li of invoice.lineItems) {
    if (li.orderLineItemId) {
      lineDelta.set(li.orderLineItemId, (lineDelta.get(li.orderLineItemId) || 0) + Number(li.quantity || 0));
    }
  }

  const nextLineItems: OrderLineItem[] = (order.lineItems || []).map((li) => {
    const add = lineDelta.get(li.id) || 0;
    const receivedQuantity = Number(li.receivedQuantity || 0) + add;
    const remainingQuantity = Math.max(0, Number(li.orderedQuantity || 0) - receivedQuantity);
    const status: OrderLineItem['status'] =
      remainingQuantity <= 0 ? 'complete' : receivedQuantity > 0 ? 'partial' : 'pending';
    return { ...li, receivedQuantity, remainingQuantity, status };
  });

  const allComplete = nextLineItems.every(li => Number(li.remainingQuantity || 0) <= 0);
  const anyReceived = nextLineItems.some(li => Number(li.receivedQuantity || 0) > 0);

  const status = allComplete ? 'complete' : anyReceived ? 'partial' : order.status;

  return {
    ...order,
    lineItems: nextLineItems,
    status,
    invoiceIds: Array.from(new Set([...(order.invoiceIds || []), invoice.id])),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Simple inventory update: add quantities by productId
 */
export function applyInvoiceToInventorySimple(
  inventory: Array<{ id: string; productId: string; quantity: number; unit: any }>,
  invoice: Invoice
) {
  const next = [...inventory];

  for (const li of invoice.lineItems) {
    const qty = Number(li.quantity || 0);
    if (qty <= 0) continue;

    const existing = next.find(i => i.productId === li.productId);
    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + qty;
    } else {
      next.push({
        id: safeId(),
        productId: li.productId,
        quantity: qty,
        unit: (li.unit as any) || 'lbs',
      });
    }
  }

  return next;
}

/**
 * Update price book with landed cost from invoice
 */
export function updatePriceBookFromInvoice(opts: {
  priceBook: PriceBookEntry[];
  invoice: Invoice;
  seasonYear: number;
  vendorId: string;
}): PriceBookEntry[] {
  const { priceBook, invoice, seasonYear, vendorId } = opts;
  const updated = [...(priceBook || [])];

  for (const li of invoice.lineItems) {
    if (!li.productId) continue;
    if (Number(li.quantity || 0) <= 0) continue;

    // Store LANDED unit cost into priceBook.price
    const landed = Number(li.landedUnitCost || 0);
    if (!Number.isFinite(landed) || landed <= 0) continue;

    const existingIdx = updated.findIndex(e =>
      (e.seasonYear === seasonYear) &&
      (e.vendorId === vendorId) &&
      (e.productId === li.productId) &&
      (e.source === 'invoice')
    );

    const entry: PriceBookEntry = {
      id: existingIdx >= 0 ? updated[existingIdx].id : `pb-inv-${invoice.id}-${li.productId}`,
      seasonYear,
      vendorId,
      productId: li.productId,
      price: landed,
      priceUom: (li.unit as any) || 'ton',
      source: 'invoice',
      effectiveDate: invoice.receivedDate,
      notes: `Invoice ${invoice.invoiceNumber} | product=$${li.unitPrice?.toFixed(2)} | freight=$${li.allocatedFreight?.toFixed(2)} | landed=$${landed.toFixed(2)}`,
    };

    if (existingIdx >= 0) {
      updated[existingIdx] = entry;
    } else {
      updated.push(entry);
    }
  }

  return updated;
}
