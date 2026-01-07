// ============================================================================
// PHASE 2.3B: Orders View with Invoice Recording
// ============================================================================
// Adds "Record Invoice" button that creates invoices with landed cost
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Package, Truck, CheckCircle, AlertTriangle, X, ReceiptText } from 'lucide-react';
import type { Vendor, Product, InventoryItem } from '@/types/farm';
import type { Order, OrderLineItem, OrderStatus, Invoice } from '@/types/orderInvoice';
import type { PriceBookEntry } from '@/types';
import { toast } from 'sonner';
import { RecordInvoiceModal } from './RecordInvoiceModal';
import { buildInvoiceFromModal, applyInvoiceToOrder, applyInvoiceToInventorySimple, updatePriceBookFromInvoice } from '@/lib/invoiceOps';

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

function statusLabel(status: OrderStatus) {
  switch (status) {
    case 'draft': return { text: 'Draft', cls: 'bg-stone-100 text-stone-700 border-stone-200' };
    case 'ordered': return { text: 'Ordered', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'confirmed': return { text: 'Confirmed', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'partial': return { text: 'Partial', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'complete': return { text: 'Complete', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'cancelled': return { text: 'Cancelled', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
    default: return { text: status || 'Unknown', cls: 'bg-stone-100 text-stone-700 border-stone-200' };
  }
}

interface OrdersViewProps {
  orders: Order[];
  vendors: Vendor[];
  products: Product[];
  inventory: InventoryItem[];
  seasonYear: number;
  onUpdateOrders: (orders: Order[]) => Promise<void> | void;
  onUpdateInventory: (inventory: InventoryItem[]) => Promise<void> | void;
  // Phase 2.3: Invoice support
  priceBook: PriceBookEntry[];
  onUpdatePriceBook: (priceBook: PriceBookEntry[]) => Promise<void> | void;
  onAddInvoice: (invoice: Invoice) => Promise<void> | void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  vendors,
  products,
  inventory,
  seasonYear,
  onUpdateOrders,
  onUpdateInventory,
  priceBook,
  onUpdatePriceBook,
  onAddInvoice,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [receiveState, setReceiveState] = useState<{
    open: boolean;
    orderId: string;
    lineId: string;
    qty: number;
    alsoAddToInventory: boolean;
  }>({ open: false, orderId: '', lineId: '', qty: 0, alsoAddToInventory: true });

  const [invoiceModalOrderId, setInvoiceModalOrderId] = useState<string | null>(null);

  const seasonOrders = useMemo(() => {
    return [...(orders || [])]
      .filter(o => o.seasonYear === seasonYear)
      .sort((a, b) => {
        const statusOrder: Record<string, number> = { draft: 0, ordered: 1, confirmed: 2, partial: 3, complete: 4, cancelled: 5 };
        const aStatus = statusOrder[a.status] ?? 3;
        const bStatus = statusOrder[b.status] ?? 3;
        if (aStatus !== bStatus) return aStatus - bStatus;
        return (b.orderDate || '').localeCompare(a.orderDate || '');
      });
  }, [orders, seasonYear]);

  const vendorName = (vendorId: string) => vendors.find(v => v.id === vendorId)?.name || 'Unknown Vendor';
  const productName = (productId: string) => products.find(p => p.id === productId)?.name || 'Unknown Product';

  const openReceive = (orderId: string, line: OrderLineItem) => {
    setReceiveState({
      open: true,
      orderId,
      lineId: line.id,
      qty: Math.max(0, Number(line.remainingQuantity || 0)),
      alsoAddToInventory: true,
    });
  };

  const applyReceive = async () => {
    const { orderId, lineId, qty, alsoAddToInventory } = receiveState;
    if (!orderId || !lineId || qty <= 0) {
      setReceiveState(prev => ({ ...prev, open: false }));
      return;
    }

    const nextOrders = (orders || []).map(o => {
      if (o.id !== orderId) return o;

      const nextLineItems = (o.lineItems || []).map(li => {
        if (li.id !== lineId) return li;

        const receivedQuantity = Number(li.receivedQuantity || 0) + qty;
        const remainingQuantity = Math.max(0, Number(li.orderedQuantity || 0) - receivedQuantity);
        const status: OrderLineItem['status'] =
          remainingQuantity <= 0 ? 'complete' : receivedQuantity > 0 ? 'partial' : 'pending';

        return { ...li, receivedQuantity, remainingQuantity, status };
      });

      const allComplete = nextLineItems.every(li => Number(li.remainingQuantity || 0) <= 0);
      const anyReceived = nextLineItems.some(li => Number(li.receivedQuantity || 0) > 0);
      const status: OrderStatus = allComplete ? 'complete' : anyReceived ? 'partial' : o.status;

      return { ...o, lineItems: nextLineItems, status, updatedAt: new Date().toISOString() };
    });

    await onUpdateOrders(nextOrders);

    if (alsoAddToInventory) {
      const order = nextOrders.find(o => o.id === orderId);
      const line = order?.lineItems.find(li => li.id === lineId);
      if (line) {
        const productId = line.productId;
        const existing = inventory.find(i => i.productId === productId);
        const nextInventory = existing
          ? inventory.map(i => i.id === existing.id ? { ...i, quantity: Number(i.quantity || 0) + qty } : i)
          : [...inventory, { id: safeId(), productId, quantity: qty, unit: (line.unit as any) || 'lbs' } as InventoryItem];

        await onUpdateInventory(nextInventory);
      }
    }

    toast.success('Received quantity saved.');
    setReceiveState(prev => ({ ...prev, open: false }));
  };

  const confirmOrder = async (orderId: string) => {
    const nextOrders = (orders || []).map(o => {
      if (o.id !== orderId) return o;
      return { ...o, status: 'ordered' as OrderStatus, updatedAt: new Date().toISOString() };
    });
    await onUpdateOrders(nextOrders);
    toast.success('Order confirmed.');
  };

  const cancelOrder = async (orderId: string) => {
    const nextOrders = (orders || []).map(o => {
      if (o.id !== orderId) return o;
      return { ...o, status: 'cancelled' as OrderStatus, updatedAt: new Date().toISOString() };
    });
    await onUpdateOrders(nextOrders);
    toast.success('Order cancelled.');
  };

  // Get order for invoice modal
  const invoiceModalOrder = useMemo(() => {
    if (!invoiceModalOrderId) return null;
    return seasonOrders.find(o => o.id === invoiceModalOrderId) || null;
  }, [invoiceModalOrderId, seasonOrders]);

  // Map real Order → RecordInvoiceModal's expected Order shape
  const recordInvoiceOrder = useMemo(() => {
    if (!invoiceModalOrder) return null;

    const receivedTotal = (invoiceModalOrder.lineItems || []).reduce(
      (s, li) => s + (Number(li.receivedQuantity || 0) * Number(li.unitPrice || 0)), 0
    );

    return {
      id: invoiceModalOrder.id,
      orderNumber: invoiceModalOrder.orderNumber,
      vendorName: vendorName(invoiceModalOrder.vendorId),
      orderDate: invoiceModalOrder.orderDate,
      status: invoiceModalOrder.status,
      paymentStatus: invoiceModalOrder.paymentStatus,
      deliveryWindow: invoiceModalOrder.deliveryWindow,
      lineItems: (invoiceModalOrder.lineItems || []).map(li => ({
        id: li.id,
        productName: productName(li.productId),
        orderedQuantity: li.orderedQuantity,
        receivedQuantity: li.receivedQuantity,
        remainingQuantity: li.remainingQuantity,
        unit: li.unit,
        unitPrice: li.unitPrice,
      })),
      subtotal: invoiceModalOrder.subtotal,
      receivedTotal,
      invoiceCount: (invoiceModalOrder.invoiceIds || []).length,
      bidEventId: invoiceModalOrder.bidEventId,
    };
  }, [invoiceModalOrder, vendors, products]);

  // Handle invoice save from modal
  const handleSaveInvoice = async (data: {
    invoiceNumber: string;
    invoiceDate: string;
    receivedDate: string;
    lineItems: Array<any>;
    charges: Array<any>;
    total: number;
  }) => {
    if (!invoiceModalOrder) return;

    // Convert modal line items → invoiceOps input
    const lineItems = data.lineItems.map((li: any) => ({
      orderLineItemId: li.id,
      productId: invoiceModalOrder.lineItems.find(x => x.id === li.id)?.productId || '',
      quantity: Number(li.quantity || 0),
      unit: li.unit,
      unitPrice: Number(li.unitPrice || 0),
      scaleTicket: li.scaleTicket || undefined,
    })).filter((x: any) => !!x.productId && x.quantity > 0);

    if (lineItems.length === 0) {
      toast.error('No line items with quantity to receive.');
      return;
    }

    const invoice = buildInvoiceFromModal({
      seasonYear,
      vendorId: invoiceModalOrder.vendorId,
      order: invoiceModalOrder,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      receivedDate: data.receivedDate,
      lineItems,
      charges: data.charges,
    });

    // Persist invoice
    await onAddInvoice(invoice);

    // Update order (received/remaining + invoiceIds)
    const updatedOrder = applyInvoiceToOrder(invoiceModalOrder, invoice);
    const nextOrders = (orders || []).map(o => o.id === updatedOrder.id ? updatedOrder : o);
    await onUpdateOrders(nextOrders);

    // Update inventory (simple add)
    const nextInventory = applyInvoiceToInventorySimple(inventory, invoice) as InventoryItem[];
    await onUpdateInventory(nextInventory);

    // Update price book with landed cost
    const nextPriceBook = updatePriceBookFromInvoice({
      priceBook,
      invoice,
      seasonYear,
      vendorId: invoiceModalOrder.vendorId,
    });
    await onUpdatePriceBook(nextPriceBook);

    toast.success('Invoice recorded. Order, inventory, and price book updated.');
    setInvoiceModalOrderId(null);
  };

  // Summary stats
  const stats = useMemo(() => {
    const draftCount = seasonOrders.filter(o => o.status === 'draft').length;
    const activeCount = seasonOrders.filter(o => ['ordered', 'confirmed', 'partial'].includes(o.status)).length;
    const completeCount = seasonOrders.filter(o => o.status === 'complete').length;
    const totalValue = seasonOrders.reduce((s, o) => s + (o.subtotal || 0), 0);
    return { draftCount, activeCount, completeCount, totalValue };
  }, [seasonOrders]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Orders</h2>
          <p className="text-sm text-stone-500 mt-1">
            Manage orders for {seasonYear}. Use "Record Invoice" for landed cost tracking.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Draft</div>
          <div className="mt-1 text-2xl font-semibold text-stone-600">{stats.draftCount}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Active</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{stats.activeCount}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Complete</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{stats.completeCount}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Total Value</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">${fmt(stats.totalValue, 0)}</div>
        </div>
      </div>

      {/* Orders List */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="grid grid-cols-12 bg-stone-50 px-5 py-3 text-xs font-semibold text-stone-600">
          <div className="col-span-3">Order</div>
          <div className="col-span-3">Vendor</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Subtotal</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-stone-200">
          {seasonOrders.map(order => {
            const pill = statusLabel(order.status);
            const isOpen = !!expanded[order.id];
            const remainingTotal = (order.lineItems || []).reduce((s, li) => s + Number(li.remainingQuantity || 0), 0);
            const isDraft = order.status === 'draft';
            const isCancelled = order.status === 'cancelled';
            const invoiceCount = (order.invoiceIds || []).length;

            return (
              <div key={order.id} className={`px-5 py-4 ${isCancelled ? 'opacity-50' : ''}`}>
                <div className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-3">
                    <div className="font-semibold text-stone-900">{order.orderNumber}</div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${pill.cls}`}>
                        {order.status === 'complete' ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : <Truck className="w-3.5 h-3.5 mr-1" />}
                        {pill.text}
                      </span>
                      {remainingTotal > 0 && !isCancelled && (
                        <span className="text-xs text-stone-500">{fmt(remainingTotal)} remaining</span>
                      )}
                      {invoiceCount > 0 && (
                        <span className="text-xs text-stone-500">{invoiceCount} invoice(s)</span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-3 text-stone-700">{vendorName(order.vendorId)}</div>
                  <div className="col-span-2 text-stone-700">{order.orderDate || '—'}</div>
                  <div className="col-span-2 text-stone-700 font-medium">${fmt(order.subtotal || 0, 0)}</div>

                  <div className="col-span-2 flex justify-end gap-2">
                    {isDraft && (
                      <>
                        <button
                          onClick={() => confirmOrder(order.id)}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => cancelOrder(order.id)}
                          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setExpanded(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                      className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-stone-50"
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded line items */}
                {isOpen && (
                  <div className="mt-4 space-y-3">
                    {/* Record Invoice button */}
                    {!isCancelled && remainingTotal > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm text-stone-600">
                          Invoice-based receiving calculates landed cost (product + freight).
                        </div>
                        <button
                          onClick={() => setInvoiceModalOrderId(order.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                        >
                          <ReceiptText className="w-4 h-4" />
                          Record Invoice
                        </button>
                      </div>
                    )}

                    <div className="rounded-2xl border border-stone-200 overflow-hidden">
                      <div className="grid grid-cols-12 bg-stone-50 px-4 py-2 text-[11px] font-semibold text-stone-600">
                        <div className="col-span-4">Product</div>
                        <div className="col-span-2">Ordered</div>
                        <div className="col-span-2">Received</div>
                        <div className="col-span-2">Remaining</div>
                        <div className="col-span-2 text-right">Action</div>
                      </div>

                      <div className="divide-y divide-stone-200 bg-white">
                        {(order.lineItems || []).map(li => {
                          const remaining = Number(li.remainingQuantity || 0);
                          const canReceive = remaining > 0 && !isCancelled;

                          return (
                            <div key={li.id} className="grid grid-cols-12 px-4 py-3 text-sm text-stone-800 items-center">
                              <div className="col-span-4">
                                <div className="font-semibold">{productName(li.productId)}</div>
                                <div className="text-xs text-stone-500">
                                  <Package className="inline w-3.5 h-3.5 mr-1" />
                                  ${fmt(li.unitPrice || 0, 2)} / {li.unit}
                                </div>
                              </div>
                              <div className="col-span-2">{fmt(li.orderedQuantity)} {li.unit}</div>
                              <div className="col-span-2">{fmt(li.receivedQuantity || 0)} {li.unit}</div>
                              <div className="col-span-2 font-semibold">
                                {remaining > 0 ? (
                                  <span className="text-amber-600">{fmt(remaining)} {li.unit}</span>
                                ) : (
                                  <span className="text-emerald-600">—</span>
                                )}
                              </div>
                              <div className="col-span-2 flex justify-end">
                                {canReceive ? (
                                  <button
                                    onClick={() => openReceive(order.id, li)}
                                    className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-stone-50"
                                  >
                                    Simple Receive
                                  </button>
                                ) : remaining <= 0 && !isCancelled ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                    <CheckCircle className="w-3.5 h-3.5" /> Done
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {order.notes && (
                        <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 text-xs text-stone-600">
                          <span className="font-semibold">Notes:</span> {order.notes}
                        </div>
                      )}
                    </div>

                    {/* Help text */}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Simple Receive</strong> updates quantities only. <strong>Record Invoice</strong> updates quantities + calculates landed cost + updates price book.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {seasonOrders.length === 0 && (
            <div className="px-5 py-12 text-center text-stone-500">
              No orders for {seasonYear}. Create draft orders from <b>Buy → Buy Workflow</b> or <b>Bid Event → Awards</b>.
            </div>
          )}
        </div>
      </div>

      {/* Simple Receive modal */}
      {receiveState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setReceiveState(prev => ({ ...prev, open: false }))} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <div className="text-lg font-semibold text-stone-900">Simple Receive</div>
                <div className="text-sm text-stone-500">Record quantity received (no freight allocation)</div>
              </div>
              <button
                onClick={() => setReceiveState(prev => ({ ...prev, open: false }))}
                className="p-2 hover:bg-stone-100 rounded-lg"
              >
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Quantity received</label>
                <input
                  type="number"
                  value={receiveState.qty}
                  onChange={(e) => setReceiveState(prev => ({ ...prev, qty: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min={0}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={receiveState.alsoAddToInventory}
                  onChange={(e) => setReceiveState(prev => ({ ...prev, alsoAddToInventory: e.target.checked }))}
                  className="rounded"
                />
                Also add to Inventory
              </label>

              <button
                onClick={applyReceive}
                className="w-full rounded-xl border border-stone-900 bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800"
              >
                Save Received
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Invoice modal */}
      <RecordInvoiceModal
        isOpen={!!recordInvoiceOrder}
        onClose={() => setInvoiceModalOrderId(null)}
        order={recordInvoiceOrder}
        onSave={handleSaveInvoice}
      />
    </div>
  );
};
