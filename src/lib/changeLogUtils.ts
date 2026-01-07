// Builds a timeline of changes from Orders, Invoices, Price Book, Bid Events

import type { Order, Invoice } from '@/types/orderInvoice';
import type { PriceBookEntry, BidEvent } from '@/types';

export type ChangeLogItem = {
  ts: string; // ISO timestamp
  type: 'invoice' | 'order' | 'price' | 'bid';
  title: string;
  detail?: string;
  amount?: number;
};

const toNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

export function buildChangeLog(opts: {
  orders: Order[];
  invoices: Invoice[];
  priceBook: PriceBookEntry[];
  bidEvents: BidEvent[];
  lookbackDays?: number;
}): ChangeLogItem[] {
  const { orders, invoices, priceBook, bidEvents } = opts;
  const lookbackDays = opts.lookbackDays ?? 120;
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

  const items: ChangeLogItem[] = [];

  // Invoices
  for (const inv of invoices || []) {
    const ts = (inv.receivedDate || inv.createdAt || '').includes('T')
      ? (inv.receivedDate || inv.createdAt)
      : `${inv.receivedDate || ''}T00:00:00Z`;
    if (!ts) continue;
    if (Date.parse(ts) < cutoff) continue;

    items.push({
      ts,
      type: 'invoice',
      title: `Invoice recorded: ${inv.invoiceNumber || 'Unknown'}`,
      detail: `Vendor: ${inv.vendorId || '—'} • Order: ${inv.orderId || 'standalone'}`,
      amount: toNum(inv.totalAmount),
    });
  }

  // Orders
  for (const o of orders || []) {
    const ts = o.createdAt || (o.orderDate ? `${o.orderDate}T00:00:00Z` : '');
    if (!ts) continue;
    if (Date.parse(ts) < cutoff) continue;

    items.push({
      ts,
      type: 'order',
      title: `Order ${o.orderNumber} (${o.status})`,
      detail: `Vendor: ${o.vendorId || '—'} • Lines: ${(o.lineItems || []).length}`,
      amount: toNum(o.subtotal),
    });
  }

  // Price Book entries
  for (const pb of priceBook || []) {
    const ts = (pb.effectiveDate || '').includes('T')
      ? pb.effectiveDate!
      : pb.effectiveDate
        ? `${pb.effectiveDate}T00:00:00Z`
        : '';
    if (!ts) continue;
    if (Date.parse(ts) < cutoff) continue;

    items.push({
      ts,
      type: 'price',
      title: `Price updated (${pb.source || 'unknown'})`,
      detail: `Product: ${pb.productId || '—'} • Vendor: ${pb.vendorId || '—'} • ${pb.priceUom || ''}`,
      amount: toNum(pb.price),
    });
  }

  // Bid Events
  for (const be of bidEvents || []) {
    const ts = be.createdAt ? String(be.createdAt) : '';
    if (!ts) continue;
    if (Date.parse(ts) < cutoff) continue;

    items.push({
      ts,
      type: 'bid',
      title: `Quote request: ${be.name || 'Unnamed'}`,
      detail: `Status: ${be.status} • Vendors: ${(be.invitedVendorIds || []).length}`,
    });
  }

  // Sort by timestamp descending (newest first)
  items.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));

  return items;
}
