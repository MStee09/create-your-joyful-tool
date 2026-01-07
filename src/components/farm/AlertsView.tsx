// ============================================================================
// AlertsView - Displays operational alerts with filtering and navigation
// ============================================================================

import React, { useMemo, useState } from 'react';
import type { Season, Product, InventoryItem } from '@/types/farm';
import type { Order, Invoice } from '@/types/orderInvoice';
import type { PriceBookEntry } from '@/types';
import { buildAlerts, type AppAlert, type AlertSeverity } from '@/lib/alertsEngine';
import { AlertTriangle, Info, Siren, Bell } from 'lucide-react';

function badge(sev: AlertSeverity) {
  if (sev === 'critical') return { cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: Siren, label: 'Critical' };
  if (sev === 'warning') return { cls: 'bg-amber-50 text-amber-800 border-amber-200', icon: AlertTriangle, label: 'Warning' };
  return { cls: 'bg-stone-50 text-stone-700 border-stone-200', icon: Info, label: 'Info' };
}

interface AlertsViewProps {
  season: Season | null;
  products: Product[];
  inventory: InventoryItem[];
  orders: Order[];
  invoices: Invoice[];
  priceBook: PriceBookEntry[];
  onNavigate: (view: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  season,
  products,
  inventory,
  orders,
  invoices,
  priceBook,
  onNavigate,
}) => {
  const [show, setShow] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const alerts = useMemo(() => {
    return buildAlerts({ season, products, inventory, orders, invoices, priceBook });
  }, [season, products, inventory, orders, invoices, priceBook]);

  const filtered = useMemo(() => {
    if (show === 'all') return alerts;
    return alerts.filter(a => a.severity === show);
  }, [alerts, show]);

  const counts = useMemo(() => ({
    all: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length,
  }), [alerts]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Alerts</h2>
          <p className="text-sm text-stone-500 mt-1">
            Operational signals generated from readiness, orders, invoices, and price book.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-stone-900">{counts.all}</div>
              <div className="text-xs text-stone-500">Total Alerts</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <Siren className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-rose-700">{counts.critical}</div>
              <div className="text-xs text-stone-500">Critical</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-amber-700">{counts.warning}</div>
              <div className="text-xs text-stone-500">Warning</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
              <Info className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-stone-700">{counts.info}</div>
              <div className="text-xs text-stone-500">Info</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'critical', 'warning', 'info'] as const).map(s => (
          <button
            key={s}
            onClick={() => setShow(s)}
            className={
              'rounded-xl border px-4 py-2 text-sm font-semibold transition ' +
              (show === s ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50')
            }
          >
            {s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="divide-y divide-stone-200">
          {filtered.map((a: AppAlert) => {
            const b = badge(a.severity);
            const Icon = b.icon;

            return (
              <div key={a.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-stone-50">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-10 h-10 rounded-xl border flex items-center justify-center ${b.cls}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900">{a.title}</div>
                    {a.detail && <div className="text-sm text-stone-600 mt-1">{a.detail}</div>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${b.cls}`}>
                        {b.label}
                      </span>
                      <span className="text-xs text-stone-400">{new Date(a.ts).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {a.action && (
                  <button
                    onClick={() => onNavigate(a.action!.view)}
                    className="shrink-0 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50"
                  >
                    {a.action.label}
                  </button>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Bell className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <h3 className="font-semibold text-stone-800 mb-2">No alerts</h3>
              <p className="text-stone-500">
                {show === 'all' 
                  ? 'Everything looks good! No operational issues detected.'
                  : `No ${show} alerts at this time.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
