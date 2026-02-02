// ============================================================================
// Application Variance View - compares recorded applications vs crop plan
// ============================================================================

import React, { useMemo, useState } from 'react';
import { CheckCircle, AlertCircle, Clock, TrendingUp, TrendingDown, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Season, Product } from '@/types/farm';
import type { ApplicationRecord } from '@/types/applicationRecord';
import { buildApplicationVarianceReport, type ApplicationVarianceRow } from '@/lib/applicationVarianceUtils';
import { exportApplicationVarianceCsv } from '@/lib/reportExportUtils';

function fmt(n: number, decimals = 1) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function pct(n: number | null) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${Math.round(n)}%`;
}

const STATUS_CONFIG = {
  'not-applied': { label: 'Not Applied', color: 'text-stone-400', bg: 'bg-stone-100', icon: Clock },
  'partial': { label: 'Partial', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle },
  'complete': { label: 'Complete', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  'over-applied': { label: 'Over Applied', color: 'text-rose-600', bg: 'bg-rose-50', icon: TrendingUp },
};

interface ApplicationVarianceViewProps {
  season: Season | null;
  products: Product[];
  applicationRecords: ApplicationRecord[];
  onBack?: () => void;
}

export const ApplicationVarianceView: React.FC<ApplicationVarianceViewProps> = ({
  season,
  products,
  applicationRecords,
  onBack,
}) => {
  const [statusFilter, setStatusFilter] = useState<ApplicationVarianceRow['status'] | 'all'>('all');
  const [cropFilter, setCropFilter] = useState<string>('all');

  const report = useMemo(
    () => buildApplicationVarianceReport({ season, products, applicationRecords }),
    [season, products, applicationRecords]
  );

  // Get unique crops for filter
  const crops = useMemo(() => {
    const unique = new Set(report.rows.map(r => r.cropName));
    return Array.from(unique).sort();
  }, [report.rows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return report.rows.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (cropFilter !== 'all' && r.cropName !== cropFilter) return false;
      return true;
    });
  }, [report.rows, statusFilter, cropFilter]);

  // Group by crop/timing for display
  const groupedRows = useMemo(() => {
    const groups: Record<string, ApplicationVarianceRow[]> = {};
    for (const row of filteredRows) {
      const key = `${row.cropName}::${row.timingName}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }
    return groups;
  }, [filteredRows]);

  const progressPct = report.totals.passesPlanned > 0
    ? Math.round((report.totals.passesComplete / report.totals.passesPlanned) * 100)
    : 0;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Actual vs. Planned Applications</h2>
          <p className="text-sm text-stone-500 mt-1">
            Compare what was actually applied in the field against your crop plan targets.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportApplicationVarianceCsv(report, season?.name || 'season')}
          disabled={report.rows.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Passes Planned</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">{report.totals.passesPlanned}</div>
          <div className="text-xs text-stone-500 mt-1">Unique crop/timing combinations</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Passes Started</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">{report.totals.passesStarted}</div>
          <div className="text-xs text-stone-500 mt-1">At least one application recorded</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs font-semibold text-stone-500">Passes Complete</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{report.totals.passesComplete}</div>
          <div className="text-xs text-stone-600 mt-1">All products fully applied</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Progress</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">{progressPct}%</div>
          <div className="mt-2 h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-stone-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="all">All Status</option>
            <option value="not-applied">Not Applied</option>
            <option value="partial">Partial</option>
            <option value="complete">Complete</option>
            <option value="over-applied">Over Applied</option>
          </select>
        </div>
        <select
          value={cropFilter}
          onChange={(e) => setCropFilter(e.target.value)}
          className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="all">All Crops</option>
          {crops.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="text-sm text-stone-500 ml-auto">
          {filteredRows.length} of {report.rows.length} products shown
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="grid grid-cols-12 bg-stone-50 px-5 py-3 text-xs font-semibold text-stone-600">
          <div className="col-span-3">Product</div>
          <div className="col-span-2">Planned</div>
          <div className="col-span-2">Actual</div>
          <div className="col-span-2">Rate Variance</div>
          <div className="col-span-2">Total Variance</div>
          <div className="col-span-1 text-right">Status</div>
        </div>

        <div className="divide-y divide-stone-200">
          {Object.entries(groupedRows).map(([groupKey, rows]) => {
            const [cropName, timingName] = groupKey.split('::');
            return (
              <div key={groupKey}>
                {/* Group header */}
                <div className="px-5 py-3 bg-stone-50 border-b border-stone-200">
                  <div className="font-semibold text-stone-800">{cropName}</div>
                  <div className="text-xs text-stone-500">{timingName}</div>
                </div>

                {/* Products in group */}
                {rows.map((r) => {
                  const StatusIcon = STATUS_CONFIG[r.status].icon;
                  const rateVarColor = (r.rateVariance || 0) > 0 ? 'text-rose-600' : (r.rateVariance || 0) < 0 ? 'text-emerald-600' : 'text-stone-600';
                  const totalVarColor = (r.totalVariance || 0) > 0 ? 'text-rose-600' : (r.totalVariance || 0) < 0 ? 'text-emerald-600' : 'text-stone-600';

                  return (
                    <div key={`${r.cropId}-${r.timingId}-${r.productId}`} className="grid grid-cols-12 px-5 py-4 text-sm text-stone-800 hover:bg-stone-50">
                      <div className="col-span-3">
                        <div className="font-medium">{r.productName}</div>
                        {r.applicationCount > 0 && (
                          <div className="text-xs text-stone-500 mt-0.5">
                            {r.applicationCount} application{r.applicationCount !== 1 ? 's' : ''} recorded
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 text-stone-700">
                        <div>{fmt(r.plannedRate, 2)} {r.rateUnit}/ac</div>
                        <div className="text-xs text-stone-500">{fmt(r.plannedAcres, 0)} ac → {fmt(r.plannedTotal, 1)} {r.rateUnit}</div>
                      </div>

                      <div className="col-span-2 text-stone-700">
                        {r.actualRate !== null ? (
                          <>
                            <div>{fmt(r.actualRate, 2)} {r.rateUnit}/ac</div>
                            <div className="text-xs text-stone-500">{fmt(r.actualAcres, 0)} ac → {fmt(r.actualTotal, 1)} {r.rateUnit}</div>
                          </>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </div>

                      <div className="col-span-2">
                        {r.rateVariance !== null ? (
                          <div className={`font-medium ${rateVarColor}`}>
                            <div className="flex items-center gap-1">
                              {r.rateVariance > 0 ? <TrendingUp className="w-3 h-3" /> : r.rateVariance < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                              {r.rateVariance >= 0 ? '+' : ''}{fmt(r.rateVariance, 2)} {r.rateUnit}/ac
                            </div>
                            <div className="text-xs font-normal">{pct(r.rateVariancePct)}</div>
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </div>

                      <div className="col-span-2">
                        {r.totalVariance !== null ? (
                          <div className={`font-medium ${totalVarColor}`}>
                            <div className="flex items-center gap-1">
                              {r.totalVariance > 0 ? <TrendingUp className="w-3 h-3" /> : r.totalVariance < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                              {r.totalVariance >= 0 ? '+' : ''}{fmt(r.totalVariance, 1)} {r.rateUnit}
                            </div>
                            <div className="text-xs font-normal">{pct(r.totalVariancePct)}</div>
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </div>

                      <div className="col-span-1 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${STATUS_CONFIG[r.status].bg} ${STATUS_CONFIG[r.status].color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {STATUS_CONFIG[r.status].label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filteredRows.length === 0 && (
            <div className="px-5 py-12 text-center text-stone-500">
              {report.rows.length === 0
                ? 'No planned applications found. Add crop plans with applications to see variance.'
                : 'No applications match the current filters.'}
            </div>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        <div className="font-semibold text-stone-900">How variance is calculated</div>
        <ul className="mt-2 space-y-1 text-stone-600 list-disc list-inside">
          <li><b>Planned</b> = Rate × Acres from crop plan (weighted by tier percentage)</li>
          <li><b>Actual</b> = Average rate and total from recorded applications</li>
          <li><b>Rate Variance</b> = Actual rate - Planned rate (positive = applied more)</li>
          <li><b>Status</b>: Complete = 95%+ acres covered; Partial = started but not finished</li>
        </ul>
      </div>
    </div>
  );
};
