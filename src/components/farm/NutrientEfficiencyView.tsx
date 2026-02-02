// ============================================================================
// Nutrient Efficiency View - compares planned vs actual N-P-K-S delivery
// ============================================================================

import React, { useMemo } from 'react';
import { CheckCircle, AlertCircle, Clock, TrendingUp, TrendingDown, Leaf, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Season, Product } from '@/types/farm';
import type { ApplicationRecord } from '@/types/applicationRecord';
import { buildNutrientEfficiencyReport, type NutrientTotals, type NutrientEfficiencyRow } from '@/lib/nutrientEfficiencyUtils';
import { exportNutrientEfficiencyCsv } from '@/lib/reportExportUtils';

function fmt(n: number, decimals = 1) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function pct(n: number) {
  if (!Number.isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${Math.round(n)}%`;
}

const NUTRIENT_CONFIG = {
  n: { label: 'N', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  p: { label: 'P', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  k: { label: 'K', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  s: { label: 'S', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
};

const STATUS_CONFIG = {
  'not-started': { label: 'Not Started', color: 'text-stone-400', bg: 'bg-stone-100', icon: Clock },
  'partial': { label: 'Partial', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle },
  'complete': { label: 'On Target', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  'over-applied': { label: 'Over', color: 'text-rose-600', bg: 'bg-rose-50', icon: TrendingUp },
};

interface NutrientCardProps {
  nutrient: keyof NutrientTotals;
  planned: number;
  actual: number;
  variance: number;
  variancePct: number;
}

const NutrientCard: React.FC<NutrientCardProps> = ({ nutrient, planned, actual, variance, variancePct }) => {
  const config = NUTRIENT_CONFIG[nutrient];
  const varColor = variance > 0 ? 'text-rose-600' : variance < 0 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-3`}>
      <div className={`text-lg font-bold ${config.color}`}>{config.label}</div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-stone-500">Plan</div>
          <div className="font-semibold text-stone-800">{fmt(planned)} lb</div>
        </div>
        <div>
          <div className="text-stone-500">Actual</div>
          <div className="font-semibold text-stone-800">{fmt(actual)} lb</div>
        </div>
        <div>
          <div className="text-stone-500">Var</div>
          <div className={`font-semibold ${varColor}`}>
            {variance >= 0 ? '+' : ''}{fmt(variance)}
          </div>
        </div>
      </div>
    </div>
  );
};

interface NutrientEfficiencyViewProps {
  season: Season | null;
  products: Product[];
  applicationRecords: ApplicationRecord[];
}

export const NutrientEfficiencyView: React.FC<NutrientEfficiencyViewProps> = ({
  season,
  products,
  applicationRecords,
}) => {
  const report = useMemo(
    () => buildNutrientEfficiencyReport({ season, products, applicationRecords }),
    [season, products, applicationRecords]
  );

  const { totals } = report;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
            <Leaf className="w-6 h-6 text-emerald-600" />
            Nutrient Efficiency Report
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Compare planned nutrient delivery (N-P-K-S lbs/ac) against what was actually applied.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportNutrientEfficiencyCsv(report, season?.name || 'season')}
          disabled={report.rows.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary cards - whole-farm weighted average */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-stone-900">Whole-Farm Average</h3>
            <p className="text-xs text-stone-500">{fmt(totals.totalAcres, 0)} total acres • weighted by crop acreage</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {(['n', 'p', 'k', 's'] as const).map(nutrient => (
            <NutrientCard
              key={nutrient}
              nutrient={nutrient}
              planned={totals.plannedNutrients[nutrient]}
              actual={totals.actualNutrients[nutrient]}
              variance={totals.varianceNutrients[nutrient]}
              variancePct={0}
            />
          ))}
        </div>
      </div>

      {/* Per-crop table */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-stone-50 border-b border-stone-200">
          <h3 className="font-semibold text-stone-900">By Crop</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 text-stone-600 text-xs font-semibold">
                <th className="px-5 py-3 text-left">Crop</th>
                <th className="px-3 py-3 text-center">Acres</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3 py-3 text-right" colSpan={2}>
                  <span className={NUTRIENT_CONFIG.n.color}>N</span> (lb/ac)
                </th>
                <th className="px-3 py-3 text-right" colSpan={2}>
                  <span className={NUTRIENT_CONFIG.p.color}>P</span> (lb/ac)
                </th>
                <th className="px-3 py-3 text-right" colSpan={2}>
                  <span className={NUTRIENT_CONFIG.k.color}>K</span> (lb/ac)
                </th>
                <th className="px-3 py-3 text-right" colSpan={2}>
                  <span className={NUTRIENT_CONFIG.s.color}>S</span> (lb/ac)
                </th>
              </tr>
              <tr className="bg-stone-50 text-stone-500 text-xs border-b border-stone-200">
                <th colSpan={3}></th>
                <th className="px-2 py-1 text-right font-normal">Plan</th>
                <th className="px-2 py-1 text-right font-normal">Actual</th>
                <th className="px-2 py-1 text-right font-normal">Plan</th>
                <th className="px-2 py-1 text-right font-normal">Actual</th>
                <th className="px-2 py-1 text-right font-normal">Plan</th>
                <th className="px-2 py-1 text-right font-normal">Actual</th>
                <th className="px-2 py-1 text-right font-normal">Plan</th>
                <th className="px-2 py-1 text-right font-normal">Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {report.rows.map((row) => {
                const StatusIcon = STATUS_CONFIG[row.status].icon;

                return (
                  <tr key={row.cropId} className="hover:bg-stone-50">
                    <td className="px-5 py-4">
                      <div className="font-medium text-stone-900">{row.cropName}</div>
                      <div className="text-xs text-stone-500">
                        {row.applicationCount} application{row.applicationCount !== 1 ? 's' : ''} recorded
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center text-stone-700">
                      {fmt(row.totalAcres, 0)}
                    </td>
                    <td className="px-3 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${STATUS_CONFIG[row.status].bg} ${STATUS_CONFIG[row.status].color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {STATUS_CONFIG[row.status].label}
                      </span>
                    </td>

                    {/* N */}
                    <td className="px-2 py-4 text-right text-stone-600">{fmt(row.plannedNutrients.n)}</td>
                    <td className="px-2 py-4 text-right">
                      <NutrientCell actual={row.actualNutrients.n} variance={row.varianceNutrients.n} />
                    </td>

                    {/* P */}
                    <td className="px-2 py-4 text-right text-stone-600">{fmt(row.plannedNutrients.p)}</td>
                    <td className="px-2 py-4 text-right">
                      <NutrientCell actual={row.actualNutrients.p} variance={row.varianceNutrients.p} />
                    </td>

                    {/* K */}
                    <td className="px-2 py-4 text-right text-stone-600">{fmt(row.plannedNutrients.k)}</td>
                    <td className="px-2 py-4 text-right">
                      <NutrientCell actual={row.actualNutrients.k} variance={row.varianceNutrients.k} />
                    </td>

                    {/* S */}
                    <td className="px-2 py-4 text-right text-stone-600">{fmt(row.plannedNutrients.s)}</td>
                    <td className="px-2 py-4 text-right">
                      <NutrientCell actual={row.actualNutrients.s} variance={row.varianceNutrients.s} />
                    </td>
                  </tr>
                );
              })}

              {report.rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-stone-500">
                    No crop data found. Add crop plans with applications to see nutrient efficiency.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        <div className="font-semibold text-stone-900">How efficiency is calculated</div>
        <ul className="mt-2 space-y-1 text-stone-600 list-disc list-inside">
          <li><b>Planned</b> = Sum of (product rate × density × nutrient %) weighted by tier percentage</li>
          <li><b>Actual</b> = Weighted average from recorded applications (nutrients × acres / total acres)</li>
          <li><b>Status</b>: On Target = within ±5% of N plan; Partial = under; Over = exceeds +5%</li>
          <li>Whole-farm totals are weighted by crop acreage for accurate aggregation</li>
        </ul>
      </div>
    </div>
  );
};

// Helper component for nutrient cells with variance coloring
const NutrientCell: React.FC<{ actual: number; variance: number }> = ({ actual, variance }) => {
  if (actual === 0 && variance === 0) {
    return <span className="text-stone-400">—</span>;
  }

  const varColor = Math.abs(variance) < 0.5
    ? 'text-stone-800'
    : variance > 0
      ? 'text-rose-600'
      : 'text-amber-600';

  return (
    <div className={`font-medium ${varColor}`}>
      {fmt(actual)}
      {Math.abs(variance) >= 0.5 && (
        <span className="text-xs ml-1">
          ({variance >= 0 ? '+' : ''}{fmt(variance)})
        </span>
      )}
    </div>
  );
};
