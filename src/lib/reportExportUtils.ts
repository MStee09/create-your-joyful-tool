// ============================================================================
// Report Export Utilities - CSV export for variance and nutrient reports
// ============================================================================

import type { ApplicationVarianceRow, ApplicationVarianceSummary } from './applicationVarianceUtils';
import type { NutrientEfficiencyRow, NutrientEfficiencySummary, NutrientTotals } from './nutrientEfficiencyUtils';

function fmt(n: number, decimals = 2) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toFixed(decimals);
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Application Variance report to CSV
 */
export function exportApplicationVarianceCsv(
  report: ApplicationVarianceSummary,
  seasonName: string
): void {
  const headers = [
    'Crop',
    'Timing',
    'Product',
    'Rate Unit',
    'Planned Rate',
    'Actual Rate',
    'Rate Variance',
    'Rate Variance %',
    'Planned Acres',
    'Actual Acres',
    'Planned Total',
    'Actual Total',
    'Total Variance',
    'Total Variance %',
    'Status',
    'Application Count',
  ];

  const rows = report.rows.map(r => [
    escapeCsv(r.cropName),
    escapeCsv(r.timingName),
    escapeCsv(r.productName),
    escapeCsv(r.rateUnit),
    fmt(r.plannedRate),
    r.actualRate != null ? fmt(r.actualRate) : '',
    r.rateVariance != null ? fmt(r.rateVariance) : '',
    r.rateVariancePct != null ? fmt(r.rateVariancePct, 1) : '',
    fmt(r.plannedAcres, 0),
    fmt(r.actualAcres, 0),
    fmt(r.plannedTotal),
    fmt(r.actualTotal),
    r.totalVariance != null ? fmt(r.totalVariance) : '',
    r.totalVariancePct != null ? fmt(r.totalVariancePct, 1) : '',
    r.status,
    String(r.applicationCount),
  ]);

  // Add summary row
  rows.push([]);
  rows.push(['SUMMARY']);
  rows.push(['Passes Planned', String(report.totals.passesPlanned)]);
  rows.push(['Passes Started', String(report.totals.passesStarted)]);
  rows.push(['Passes Complete', String(report.totals.passesComplete)]);
  rows.push(['Total Planned Acres', fmt(report.totals.plannedAcres, 0)]);
  rows.push(['Total Applied Acres', fmt(report.totals.appliedAcres, 0)]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCsv(csv, `application-variance-${seasonName.replace(/\s+/g, '-').toLowerCase()}.csv`);
}

/**
 * Export Nutrient Efficiency report to CSV
 */
export function exportNutrientEfficiencyCsv(
  report: NutrientEfficiencySummary,
  seasonName: string
): void {
  const headers = [
    'Crop',
    'Acres',
    'Status',
    'Planned N (lb/ac)',
    'Actual N (lb/ac)',
    'N Variance',
    'Planned P (lb/ac)',
    'Actual P (lb/ac)',
    'P Variance',
    'Planned K (lb/ac)',
    'Actual K (lb/ac)',
    'K Variance',
    'Planned S (lb/ac)',
    'Actual S (lb/ac)',
    'S Variance',
    'Application Count',
  ];

  const rows = report.rows.map(r => [
    escapeCsv(r.cropName),
    fmt(r.totalAcres, 0),
    r.status,
    fmt(r.plannedNutrients.n),
    fmt(r.actualNutrients.n),
    fmt(r.varianceNutrients.n),
    fmt(r.plannedNutrients.p),
    fmt(r.actualNutrients.p),
    fmt(r.varianceNutrients.p),
    fmt(r.plannedNutrients.k),
    fmt(r.actualNutrients.k),
    fmt(r.varianceNutrients.k),
    fmt(r.plannedNutrients.s),
    fmt(r.actualNutrients.s),
    fmt(r.varianceNutrients.s),
    String(r.applicationCount),
  ]);

  // Add summary row
  rows.push([]);
  rows.push(['WHOLE-FARM SUMMARY']);
  rows.push(['Total Acres', fmt(report.totals.totalAcres, 0)]);
  rows.push(['']);
  rows.push(['Nutrient', 'Planned (lb/ac)', 'Actual (lb/ac)', 'Variance']);
  rows.push(['N', fmt(report.totals.plannedNutrients.n), fmt(report.totals.actualNutrients.n), fmt(report.totals.varianceNutrients.n)]);
  rows.push(['P', fmt(report.totals.plannedNutrients.p), fmt(report.totals.actualNutrients.p), fmt(report.totals.varianceNutrients.p)]);
  rows.push(['K', fmt(report.totals.plannedNutrients.k), fmt(report.totals.actualNutrients.k), fmt(report.totals.varianceNutrients.k)]);
  rows.push(['S', fmt(report.totals.plannedNutrients.s), fmt(report.totals.actualNutrients.s), fmt(report.totals.varianceNutrients.s)]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCsv(csv, `nutrient-efficiency-${seasonName.replace(/\s+/g, '-').toLowerCase()}.csv`);
}

/**
 * Export Application History to CSV
 */
export function exportApplicationHistoryCsv(
  records: Array<{
    date: string;
    fieldName: string;
    cropName: string;
    timingName: string;
    acresTreated: number;
    applicator: string;
    products: Array<{
      name: string;
      rate: number;
      rateUnit: string;
      total: number;
    }>;
    notes?: string;
  }>,
  seasonName: string
): void {
  const headers = [
    'Date',
    'Field',
    'Crop',
    'Timing',
    'Acres',
    'Applicator',
    'Product',
    'Rate',
    'Rate Unit',
    'Total Applied',
    'Notes',
  ];

  const rows: string[][] = [];

  for (const record of records) {
    for (let i = 0; i < record.products.length; i++) {
      const prod = record.products[i];
      rows.push([
        i === 0 ? record.date : '',
        i === 0 ? escapeCsv(record.fieldName) : '',
        i === 0 ? escapeCsv(record.cropName) : '',
        i === 0 ? escapeCsv(record.timingName) : '',
        i === 0 ? fmt(record.acresTreated, 0) : '',
        i === 0 ? record.applicator : '',
        escapeCsv(prod.name),
        fmt(prod.rate),
        prod.rateUnit,
        fmt(prod.total),
        i === 0 ? escapeCsv(record.notes || '') : '',
      ]);
    }
    // Add empty row if no products
    if (record.products.length === 0) {
      rows.push([
        record.date,
        escapeCsv(record.fieldName),
        escapeCsv(record.cropName),
        escapeCsv(record.timingName),
        fmt(record.acresTreated, 0),
        record.applicator,
        '',
        '',
        '',
        '',
        escapeCsv(record.notes || ''),
      ]);
    }
  }

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCsv(csv, `application-history-${seasonName.replace(/\s+/g, '-').toLowerCase()}.csv`);
}
