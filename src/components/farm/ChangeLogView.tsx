// "What Changed" timeline view - shows recent orders, invoices, price updates

import React, { useMemo, useState } from 'react';
import { ReceiptText, ShoppingCart, Tag, FileText, Clock } from 'lucide-react';
import type { Order, Invoice } from '@/types/orderInvoice';
import type { PriceBookEntry, BidEvent } from '@/types';
import { buildChangeLog, type ChangeLogItem } from '@/lib/changeLogUtils';

function money(n?: number) {
  if (n == null) return '';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatDate(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return ts;
  }
}

function formatTime(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

interface ChangeLogViewProps {
  orders: Order[];
  invoices: Invoice[];
  priceBook: PriceBookEntry[];
  bidEvents: BidEvent[];
}

export const ChangeLogView: React.FC<ChangeLogViewProps> = ({
  orders,
  invoices,
  priceBook,
  bidEvents,
}) => {
  const [days, setDays] = useState(120);
  const [filterType, setFilterType] = useState<string>('all');

  const items = useMemo(
    () => buildChangeLog({ orders, invoices, priceBook, bidEvents, lookbackDays: days }),
    [orders, invoices, priceBook, bidEvents, days]
  );

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return items;
    return items.filter(it => it.type === filterType);
  }, [items, filterType]);

  const iconFor = (t: string) => {
    switch (t) {
      case 'invoice': return <ReceiptText className="w-4 h-4" />;
      case 'order': return <ShoppingCart className="w-4 h-4" />;
      case 'price': return <Tag className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const colorFor = (t: string) => {
    switch (t) {
      case 'invoice': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'order': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'price': return 'bg-amber-50 border-amber-200 text-amber-700';
      default: return 'bg-purple-50 border-purple-200 text-purple-700';
    }
  };

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, ChangeLogItem[]>();
    for (const item of filteredItems) {
      const date = formatDate(item.ts);
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date)!.push(item);
    }
    return Array.from(groups.entries());
  }, [filteredItems]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">What Changed</h2>
          <p className="text-sm text-stone-500 mt-1">
            Timeline of orders, invoices, bid events, and price book updates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All types</option>
            <option value="order">Orders</option>
            <option value="invoice">Invoices</option>
            <option value="price">Price updates</option>
            <option value="bid">Bid events</option>
          </select>

          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={120}>Last 120 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Total Events</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">{items.length}</div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-xs font-semibold text-blue-600">Orders</div>
          <div className="mt-1 text-2xl font-semibold text-blue-700">
            {items.filter(i => i.type === 'order').length}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs font-semibold text-emerald-600">Invoices</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">
            {items.filter(i => i.type === 'invoice').length}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold text-amber-600">Price Updates</div>
          <div className="mt-1 text-2xl font-semibold text-amber-700">
            {items.filter(i => i.type === 'price').length}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        {groupedByDate.map(([date, dateItems]) => (
          <div key={date}>
            {/* Date header */}
            <div className="px-5 py-3 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-400" />
              <span className="text-sm font-semibold text-stone-700">{date}</span>
              <span className="text-xs text-stone-500">({dateItems.length} events)</span>
            </div>

            {/* Items for this date */}
            <div className="divide-y divide-stone-100">
              {dateItems.map((it, idx) => (
                <div key={idx} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-stone-50">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-8 h-8 rounded-xl border flex items-center justify-center ${colorFor(it.type)}`}>
                      {iconFor(it.type)}
                    </div>
                    <div>
                      <div className="font-semibold text-stone-900">{it.title}</div>
                      {it.detail && (
                        <div className="text-sm text-stone-600 mt-0.5">{it.detail}</div>
                      )}
                      <div className="text-xs text-stone-400 mt-1">{formatTime(it.ts)}</div>
                    </div>
                  </div>

                  {it.amount != null && it.amount > 0 && (
                    <div className="text-sm font-semibold text-stone-900">{money(it.amount)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="px-5 py-12 text-center text-stone-500">
            No changes found in this time period.
          </div>
        )}
      </div>
    </div>
  );
};
