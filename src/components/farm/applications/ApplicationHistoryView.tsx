// ============================================================================
// Application History View - Timeline of recorded applications by field
// ============================================================================

import React, { useState, useMemo } from 'react';
import { Calendar, MapPin, Droplets, Clock, Filter, ChevronDown, ChevronRight, User, Truck, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Season, ProductMaster } from '@/types';
import type { Field } from '@/types/field';
import type { ApplicationRecord } from '@/types/applicationRecord';
import { exportApplicationHistoryCsv } from '@/lib/reportExportUtils';

function fmt(n: number, decimals = 1) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

interface ApplicationHistoryViewProps {
  season: Season | null;
  applicationRecords: ApplicationRecord[];
  fields: Field[];
  productMasters: ProductMaster[];
  crops: { id: string; name: string }[];
}

export const ApplicationHistoryView: React.FC<ApplicationHistoryViewProps> = ({
  season,
  applicationRecords,
  fields,
  productMasters,
  crops,
}) => {
  const [fieldFilter, setFieldFilter] = useState<string>('all');
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  // Filter records by season
  const seasonRecords = useMemo(() => {
    if (!season) return [];
    return applicationRecords.filter(r => r.seasonId === season.id);
  }, [applicationRecords, season]);

  // Get unique fields and crops for filters
  const uniqueFields = useMemo(() => {
    const ids = new Set(seasonRecords.map(r => r.fieldId));
    return fields.filter(f => ids.has(f.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [seasonRecords, fields]);

  const uniqueCrops = useMemo(() => {
    const ids = new Set(seasonRecords.map(r => r.cropId));
    return crops.filter(c => ids.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [seasonRecords, crops]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    return seasonRecords.filter(r => {
      if (fieldFilter !== 'all' && r.fieldId !== fieldFilter) return false;
      if (cropFilter !== 'all' && r.cropId !== cropFilter) return false;
      return true;
    });
  }, [seasonRecords, fieldFilter, cropFilter]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, ApplicationRecord[]> = {};
    for (const record of filteredRecords) {
      const date = record.dateApplied.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(record);
    }
    // Sort dates descending (most recent first)
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredRecords]);

  const toggleExpand = (id: string) => {
    setExpandedRecords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getFieldName = (id: string) => fields.find(f => f.id === id)?.name || 'Unknown Field';
  const getCropName = (id: string) => crops.find(c => c.id === id)?.name || 'Unknown Crop';
  const getProductName = (id: string) => productMasters.find(p => p.id === id)?.name || 'Unknown Product';
  const getTimingName = (cropId: string, timingId: string) => {
    const crop = season?.crops?.find(c => c.id === cropId);
    return crop?.applicationTimings?.find(t => t.id === timingId)?.name || 'Unknown Pass';
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-stone-600" />
            Application History
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Timeline of all recorded field applications for {season?.name || 'the current season'}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const exportData = filteredRecords.map(record => ({
              date: record.dateApplied,
              fieldName: getFieldName(record.fieldId),
              cropName: getCropName(record.cropId),
              timingName: getTimingName(record.cropId, record.timingId),
              acresTreated: record.acresTreated,
              applicator: record.applicator === 'self' ? 'Self' : record.customApplicatorName || 'Custom',
              products: (record.products || []).map(p => ({
                name: getProductName(p.productId),
                rate: p.actualRate,
                rateUnit: p.rateUnit,
                total: p.totalApplied,
              })),
              notes: record.notes,
            }));
            exportApplicationHistoryCsv(exportData, season?.name || 'season');
          }}
          disabled={filteredRecords.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Total Applications</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">{filteredRecords.length}</div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Fields Covered</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">
            {new Set(filteredRecords.map(r => r.fieldId)).size}
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">Total Acres Treated</div>
          <div className="mt-1 text-2xl font-semibold text-stone-900">
            {fmt(filteredRecords.reduce((sum, r) => sum + r.acresTreated, 0), 0)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-stone-400" />
          <select
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="all">All Fields</option>
            {uniqueFields.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <select
          value={cropFilter}
          onChange={(e) => setCropFilter(e.target.value)}
          className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="all">All Crops</option>
          {uniqueCrops.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="text-sm text-stone-500 ml-auto">
          {filteredRecords.length} of {seasonRecords.length} records shown
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {groupedByDate.map(([date, records]) => (
          <div key={date}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 text-sm font-semibold">
                <Calendar className="w-4 h-4" />
                {formatDate(date)}
              </div>
              <div className="flex-1 h-px bg-stone-200" />
              <div className="text-xs text-stone-500">{records.length} application{records.length !== 1 ? 's' : ''}</div>
            </div>

            {/* Records for this date */}
            <div className="space-y-2 ml-4 border-l-2 border-stone-200 pl-4">
              {records.map(record => {
                const isExpanded = expandedRecords.has(record.id);
                const fieldName = getFieldName(record.fieldId);
                const cropName = getCropName(record.cropId);
                const timingName = getTimingName(record.cropId, record.timingId);

                return (
                  <div
                    key={record.id}
                    className="rounded-xl border border-stone-200 bg-white overflow-hidden"
                  >
                    {/* Collapsed header */}
                    <button
                      onClick={() => toggleExpand(record.id)}
                      className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-stone-50 transition-colors"
                    >
                      <div className="text-stone-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>

                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MapPin className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        <span className="font-medium text-stone-900 truncate">{fieldName}</span>
                        <span className="text-stone-400">•</span>
                        <span className="text-stone-600 truncate">{cropName}</span>
                        <span className="text-stone-400">•</span>
                        <span className="text-stone-500 truncate">{timingName}</span>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0 text-sm text-stone-600">
                        <span>{fmt(record.acresTreated, 0)} ac</span>
                        <span className="text-stone-400">•</span>
                        <span>{record.products?.length || 0} product{(record.products?.length || 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-stone-100 space-y-4">
                        {/* Products */}
                        <div>
                          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Products Applied</div>
                          <div className="space-y-2">
                            {record.products?.map((prod, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm bg-stone-50 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Droplets className="w-4 h-4 text-blue-500" />
                                  <span className="font-medium text-stone-800">{getProductName(prod.productId)}</span>
                                </div>
                                <div className="text-stone-600">
                                  {fmt(prod.actualRate, 2)} {prod.rateUnit}/ac → {fmt(prod.totalApplied, 1)} {prod.rateUnit} total
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-stone-600">
                            <User className="w-4 h-4 text-stone-400" />
                            <span>
                              {record.applicator === 'self' ? 'Self-applied' : `Custom: ${record.customApplicatorName || 'Unknown'}`}
                            </span>
                          </div>
                          {record.equipmentId && (
                            <div className="flex items-center gap-2 text-stone-600">
                              <Truck className="w-4 h-4 text-stone-400" />
                              <span>Equipment ID: {record.equipmentId.slice(0, 8)}...</span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {(record.notes || record.weatherNotes) && (
                          <div className="text-sm text-stone-600">
                            {record.weatherNotes && (
                              <div className="mb-1"><b>Weather:</b> {record.weatherNotes}</div>
                            )}
                            {record.notes && (
                              <div><b>Notes:</b> {record.notes}</div>
                            )}
                          </div>
                        )}

                        {/* Overridden warnings */}
                        {record.overriddenWarnings && record.overriddenWarnings.length > 0 && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="text-xs font-semibold text-amber-700 mb-1">Overridden Warnings</div>
                            <ul className="text-xs text-amber-800 space-y-1">
                              {record.overriddenWarnings.map((w, i) => (
                                <li key={i}>• {w.message} — <i>{w.overrideReason}</i></li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredRecords.length === 0 && (
          <div className="text-center py-12 text-stone-500">
            {seasonRecords.length === 0
              ? 'No applications recorded yet. Use "Record Application" to log field activity.'
              : 'No applications match the current filters.'}
          </div>
        )}
      </div>
    </div>
  );
};
