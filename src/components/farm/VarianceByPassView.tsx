// Variance by Crop/Pass view - shows allocated actual cost by application timing

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { Season, Product } from '@/types/farm';
import type { Invoice } from '@/types/orderInvoice';
import type { PriceBookEntry } from '@/types';
import { buildVarianceByPassReport } from '@/lib/varianceByPassUtils';

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function pct(n: number | null) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${Math.round(n)}%`;
}

interface VarianceByPassViewProps {
  season: Season | null;
  products: Product[];
  invoices: Invoice[];
  priceBook: PriceBookEntry[];
}

export const VarianceByPassView: React.FC<VarianceByPassViewProps> = ({
  season,
  products,
  invoices,
  priceBook,
}) => {
  const report = useMemo(
    () => buildVarianceByPassReport({ season, products, invoices, priceBook }),
    [season, products, invoices, priceBook]
  );

  const varianceColor =
    report.varianceTotal > 0 ? 'text-rose-600' : report.varianceTotal < 0 ? 'text-emerald-600' : 'text-stone-700';

  const varianceBg =
    report.varianceTotal > 0 ? 'bg-rose-50 border-rose-200' : report.varianceTotal < 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200';

  const VarianceIcon = report.varianceTotal > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Variance by Crop/Pass</h2>
        <p className="text-sm text-stone-500 mt-1">
          Actual invoice cost is allocated across passes in proportion to planned quantities.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Planned Total</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">{money(report.plannedTotal)}</div>
          <div className="text-xs text-stone-500 mt-1">From price book</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Actual (Allocated)</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">{money(report.actualTotalAllocated)}</div>
          <div className="text-xs text-stone-500 mt-1">From invoices</div>
        </div>
        <div className={`rounded-2xl border p-4 ${varianceBg}`}>
          <div className="text-xs font-semibold text-stone-500">Variance</div>
          <div className={`mt-1 text-2xl font-semibold flex items-center gap-2 ${varianceColor}`}>
            <VarianceIcon className="w-5 h-5" />
            {money(Math.abs(report.varianceTotal))}
          </div>
          <div className="text-xs text-stone-600 mt-1">
            {report.varianceTotal > 0 ? 'Over plan' : report.varianceTotal < 0 ? 'Under plan' : 'On plan'}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="grid grid-cols-12 bg-stone-50 px-5 py-3 text-xs font-semibold text-stone-600">
          <div className="col-span-4">Crop / Pass</div>
          <div className="col-span-3">Planned</div>
          <div className="col-span-3">Actual (Allocated)</div>
          <div className="col-span-2 text-right">Variance</div>
        </div>

        <div className="divide-y divide-stone-200">
          {report.rows.map((r, idx) => {
            const v = r.variance || 0;
            const vCls = v > 0 ? 'text-rose-600' : v < 0 ? 'text-emerald-600' : 'text-stone-600';
            const vBg = v > 0 ? 'bg-rose-50' : v < 0 ? 'bg-emerald-50' : '';

            const flags = [
              r.flags.missingPlannedPrice ? 'Missing planned price' : null,
              r.flags.noInvoices ? 'No invoices' : null,
            ].filter(Boolean).join(' • ');

            return (
              <div key={`${r.cropName}-${r.timingName}-${idx}`} className={`grid grid-cols-12 px-5 py-4 text-sm text-stone-800 ${vBg}`}>
                <div className="col-span-4">
                  <div className="font-semibold">{r.cropName}</div>
                  <div className="text-xs text-stone-500">{r.timingName}</div>
                  {flags && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                      <AlertTriangle className="w-3 h-3" />
                      {flags}
                    </div>
                  )}
                </div>

                <div className="col-span-3 text-stone-700 font-medium">
                  {r.plannedCost == null ? '—' : money(r.plannedCost)}
                </div>

                <div className="col-span-3 text-stone-700 font-medium">
                  {money(r.actualCostAllocated)}
                </div>

                <div className={`col-span-2 text-right font-semibold ${vCls}`}>
                  {r.variance == null ? (
                    <span className="text-stone-400">—</span>
                  ) : (
                    <>
                      <div>{v >= 0 ? '+' : ''}{money(v)}</div>
                      <div className="text-xs font-medium text-stone-500">{pct(r.variancePct)}</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {report.rows.length === 0 && (
            <div className="px-5 py-12 text-center text-stone-500">
              No crop/pass data. Add crop plans with applications to see variance by pass.
            </div>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <div className="font-semibold text-amber-900">Note on allocation</div>
        <div className="mt-1">
          Actual cost is allocated across passes based on <b>planned quantity proportions</b>. 
          This is an estimate — we don't know exactly which pass consumed which invoice line item.
        </div>
      </div>
    </div>
  );
};
