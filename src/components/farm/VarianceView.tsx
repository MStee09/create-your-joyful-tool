// ============================================================================
// Plan vs Actual variance view - shows planned cost vs actual landed cost
// ============================================================================

import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Season, Product } from '@/types/farm';
import type { Invoice } from '@/types/orderInvoice';
import type { PriceBookEntry } from '@/types';
import { buildVarianceReport } from '@/lib/varianceUtils';

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function moneyDetail(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmt(n: number, decimals = 1) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

interface VarianceViewProps {
  season: Season | null;
  products: Product[];
  invoices: Invoice[];
  priceBook: PriceBookEntry[];
}

export const VarianceView: React.FC<VarianceViewProps> = ({
  season,
  products,
  invoices,
  priceBook,
}) => {
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  const report = useMemo(() => {
    return buildVarianceReport({ season, products, invoices, priceBook });
  }, [season, products, invoices, priceBook]);

  const rows = useMemo(() => {
    if (!showOnlyIssues) return report.rows;
    return report.rows.filter(r =>
      r.flags.missingPlannedPrice ||
      r.flags.unitMismatch ||
      r.flags.noInvoices ||
      (r.variance != null && Math.abs(r.variance) > 0.01)
    );
  }, [report.rows, showOnlyIssues]);

  const varianceColor =
    report.varianceTotal > 0 ? 'text-rose-600' : report.varianceTotal < 0 ? 'text-emerald-600' : 'text-stone-700';

  const varianceBg =
    report.varianceTotal > 0 ? 'bg-rose-50 border-rose-200' : report.varianceTotal < 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200';

  const VarianceIcon = report.varianceTotal > 0 ? TrendingUp : TrendingDown;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Plan vs Actual Variance</h2>
        <p className="text-sm text-stone-500 mt-1">
          Planned cost uses Price Book (non-invoice sources). Actual cost uses invoice landed totals.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Planned Total</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">{money(report.plannedTotal)}</div>
          <div className="text-xs text-stone-500 mt-1">From price book</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Actual Total</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">{money(report.actualTotal)}</div>
          <div className="text-xs text-stone-500 mt-1">From invoices (landed)</div>
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
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Coverage</div>
          <div className="mt-1 text-sm text-stone-700 space-y-1">
            <div className="flex justify-between">
              <span>Products in plan:</span>
              <b>{report.coverage.totalProductsInPlan}</b>
            </div>
            <div className="flex justify-between">
              <span>With invoices:</span>
              <b>{report.coverage.withInvoices}</b>
            </div>
            <div className="flex justify-between">
              <span>With planned price:</span>
              <b>{report.coverage.withPlannedPrice}</b>
            </div>
            {report.coverage.unitMismatch > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Unit mismatch:</span>
                <b>{report.coverage.unitMismatch}</b>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={showOnlyIssues}
            onChange={(e) => setShowOnlyIssues(e.target.checked)}
            className="rounded"
          />
          Show only issues / non-zero variance
        </label>
        <div className="text-sm text-stone-500">
          {rows.length} of {report.rows.length} products shown
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="grid grid-cols-12 bg-stone-50 px-5 py-3 text-xs font-semibold text-stone-600">
          <div className="col-span-3">Product</div>
          <div className="col-span-2">Planned Qty</div>
          <div className="col-span-2">Actual Qty</div>
          <div className="col-span-2">Planned $</div>
          <div className="col-span-2">Actual $</div>
          <div className="col-span-1 text-right">Variance</div>
        </div>

        <div className="divide-y divide-stone-200">
          {rows.map((r) => {
            const v = r.variance || 0;
            const vCls = v > 0 ? 'text-rose-600' : v < 0 ? 'text-emerald-600' : 'text-stone-600';
            const vBg = v > 0 ? 'bg-rose-50' : v < 0 ? 'bg-emerald-50' : '';

            const flags: string[] = [];
            if (r.flags.missingPlannedPrice) flags.push('No planned price');
            if (r.flags.noInvoices) flags.push('No invoices');
            if (r.flags.unitMismatch) flags.push('Unit mismatch');

            return (
              <div key={r.productId} className={`grid grid-cols-12 px-5 py-4 text-sm text-stone-800 ${vBg}`}>
                <div className="col-span-3">
                  <div className="font-semibold">{r.productName}</div>
                  {flags.length > 0 ? (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">
                      <AlertTriangle className="w-3 h-3" />
                      {flags.join(' • ')}
                    </div>
                  ) : r.variance != null ? (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-stone-500">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      Source: <b>{r.plannedPriceSource || '—'}</b>
                    </div>
                  ) : null}
                </div>

                <div className="col-span-2 text-stone-700">
                  <div>{fmt(r.plannedQty)} {r.plannedUnit}</div>
                  <div className="text-xs text-stone-500">
                    {r.plannedUnitPrice != null ? `${moneyDetail(r.plannedUnitPrice)} / ${r.plannedUnit}` : '—'}
                  </div>
                </div>

                <div className="col-span-2 text-stone-700">
                  <div>{r.actualQty > 0 ? `${fmt(r.actualQty)} ${r.plannedUnit}` : '—'}</div>
                  <div className="text-xs text-stone-500">
                    {r.actualUnitCost != null ? `${moneyDetail(r.actualUnitCost)} / ${r.plannedUnit}` : '—'}
                  </div>
                </div>

                <div className="col-span-2 text-stone-700 font-medium">
                  {r.plannedCost != null ? money(r.plannedCost) : '—'}
                </div>

                <div className="col-span-2 text-stone-700 font-medium">
                  {r.actualCost > 0 ? money(r.actualCost) : '—'}
                </div>

                <div className={`col-span-1 text-right font-semibold ${vCls}`}>
                  {r.variance != null ? (
                    <>
                      <div>{v >= 0 ? '+' : ''}{money(v)}</div>
                      {r.variancePct != null && (
                        <div className="text-xs font-medium">
                          {v >= 0 ? '+' : ''}{fmt(r.variancePct, 0)}%
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="px-5 py-12 text-center text-stone-500">
              {showOnlyIssues
                ? 'No issues found. All products are on track!'
                : 'No variance data. Add crop plans, price book entries, and invoices to see variance.'}
            </div>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        <div className="font-semibold text-stone-900">How variance is calculated</div>
        <ul className="mt-2 space-y-1 text-stone-600 list-disc list-inside">
          <li><b>Planned Cost</b> = Planned Qty × Price Book price (non-invoice sources)</li>
          <li><b>Actual Cost</b> = Invoice landed total (product + allocated freight)</li>
          <li><b>Variance</b> = Actual - Planned (positive = over plan)</li>
          <li>Unit conversions: ton ↔ lbs automatic; gal ↔ lbs requires density (flagged)</li>
        </ul>
      </div>
    </div>
  );
};
