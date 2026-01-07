// ============================================================================
// Calculates Plan vs Actual variance using price book and invoice data
// ============================================================================

import type { PriceBookEntry, Product } from '@/types';
import type { Invoice } from '@/types/orderInvoice';
import type { Season } from '@/types/farm';
import { calculatePlannedUsage, type PlannedUsageItem } from '@/lib/calculations';

type Unit = 'ton' | 'lbs' | 'gal' | string;

export type VarianceRow = {
  productId: string;
  productName: string;

  plannedQty: number;
  plannedUnit: Unit;
  plannedUnitPrice: number | null;
  plannedCost: number | null;
  plannedPriceSource: PriceBookEntry['source'] | null;

  actualQty: number;
  actualUnitCost: number | null;
  actualCost: number;

  variance: number | null;
  variancePct: number | null;

  flags: {
    missingPlannedPrice?: boolean;
    unitMismatch?: boolean;
    noInvoices?: boolean;
  };
};

export type VarianceSummary = {
  plannedTotal: number;
  actualTotal: number;
  varianceTotal: number;
  rows: VarianceRow[];
  coverage: {
    totalProductsInPlan: number;
    withInvoices: number;
    withPlannedPrice: number;
    computed: number;
    unitMismatch: number;
  };
};

const toNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

function convertQty(qty: number, fromUnit: Unit, toUnit: Unit): number | null {
  const f = String(fromUnit).toLowerCase();
  const t = String(toUnit).toLowerCase();

  if (f === t) return qty;

  // Safe conversions: ton <-> lbs
  if ((f === 'ton' || f === 'tons') && (t === 'lb' || t === 'lbs')) return qty * 2000;
  if ((t === 'ton' || t === 'tons') && (f === 'lb' || f === 'lbs')) return qty / 2000;

  // gal <-> lbs needs density; skip to avoid "quiet wrongness"
  return null;
}

function normalizeUom(u?: string): Unit {
  const x = (u || '').toLowerCase();
  if (x === 'lb' || x === 'lbs' || x === 'pound' || x === 'pounds') return 'lbs';
  if (x === 'ton' || x === 'tons') return 'ton';
  if (x === 'gal' || x === 'gallon' || x === 'gallons') return 'gal';
  return u || '';
}

/**
 * Planned price should NOT use invoice prices. Uses:
 * manual_override > manual > awarded > estimated
 */
function getPlannedPriceEntry(
  productId: string,
  seasonYear: number,
  priceBook: PriceBookEntry[]
): PriceBookEntry | null {
  const candidates = (priceBook || []).filter(e =>
    e.seasonYear === seasonYear &&
    e.productId === productId &&
    e.source !== 'invoice'
  );

  const rank = (src?: string) => {
    switch (src) {
      case 'manual_override': return 0;
      case 'manual': return 1;
      case 'awarded': return 2;
      case 'estimated': return 3;
      default: return 9;
    }
  };

  candidates.sort((a, b) => rank(a.source) - rank(b.source));
  return candidates[0] || null;
}

export function buildVarianceReport(opts: {
  season: Season | null;
  products: Product[];
  invoices: Invoice[];
  priceBook: PriceBookEntry[];
}): VarianceSummary {
  const { season, products, invoices, priceBook } = opts;
  const seasonYear = season?.year || new Date().getFullYear();

  // Planned usage by product
  const plannedUsage: PlannedUsageItem[] = calculatePlannedUsage(season, products);

  const plannedByProduct = new Map<string, { qty: number; unit: Unit }>();
  for (const u of plannedUsage) {
    plannedByProduct.set(u.productId, { qty: toNum(u.totalNeeded), unit: normalizeUom(u.unit) });
  }

  // Actuals from invoices by product (sum landed totals + quantities)
  const actualByProduct = new Map<string, { cost: number; qty: number; unit: Unit }>();
  for (const inv of invoices || []) {
    if (inv.seasonYear !== seasonYear) continue;
    for (const li of inv.lineItems || []) {
      const productId = li.productId;
      if (!productId) continue;

      const qty = toNum(li.quantity);
      const unit = normalizeUom(li.unit);
      const cost = toNum(li.landedTotal) || (toNum(li.landedUnitCost) * qty);

      const curr = actualByProduct.get(productId) || { cost: 0, qty: 0, unit };
      curr.cost += cost;
      curr.qty += qty;
      actualByProduct.set(productId, curr);
    }
  }

  // Build rows for every planned product
  const rows: VarianceRow[] = [];
  let plannedTotal = 0;
  let actualTotal = 0;

  let withInvoices = 0;
  let withPlannedPrice = 0;
  let computed = 0;
  let unitMismatch = 0;

  for (const [productId, p] of plannedByProduct.entries()) {
    const productName = products.find(x => x.id === productId)?.name || 'Unknown product';

    const plannedPriceEntry = getPlannedPriceEntry(productId, seasonYear, priceBook);
    const plannedPriceUom = normalizeUom(plannedPriceEntry?.priceUom || (plannedPriceEntry as any)?.unit || '');
    const plannedUnit = p.unit;

    let plannedUnitPrice: number | null = null;
    if (plannedPriceEntry) {
      const price = toNum(plannedPriceEntry.price);
      if (plannedPriceUom === plannedUnit || !plannedPriceUom) {
        plannedUnitPrice = price;
      } else {
        // Convert price to planned unit if possible
        const priceUomToPlanned = convertQty(1, plannedPriceUom, plannedUnit);
        if (priceUomToPlanned && priceUomToPlanned > 0) {
          plannedUnitPrice = price / priceUomToPlanned;
        }
      }
    }

    const plannedCost = plannedUnitPrice != null ? (p.qty * plannedUnitPrice) : null;

    const actual = actualByProduct.get(productId);
    const hasInvoices = !!actual && actual.cost > 0 && actual.qty > 0;

    let actualQtyInPlannedUnit = 0;
    let actualUnitCost: number | null = null;
    let flags: VarianceRow['flags'] = {};

    if (!plannedPriceEntry) flags.missingPlannedPrice = true;

    if (hasInvoices) {
      withInvoices += 1;
      const actualUnit = actual!.unit;

      const converted = convertQty(actual!.qty, actualUnit, plannedUnit);
      if (converted == null) {
        flags.unitMismatch = true;
        unitMismatch += 1;
        actualQtyInPlannedUnit = 0;
        actualUnitCost = null;
      } else {
        actualQtyInPlannedUnit = converted;
        actualUnitCost = actualQtyInPlannedUnit > 0 ? (actual!.cost / actualQtyInPlannedUnit) : null;
      }
    } else {
      flags.noInvoices = true;
    }

    const actualCost = hasInvoices ? actual!.cost : 0;

    let variance: number | null = null;
    let variancePct: number | null = null;

    if (plannedCost != null && hasInvoices && actualUnitCost != null) {
      variance = actualCost - plannedCost;
      variancePct = plannedCost > 0 ? (variance / plannedCost) * 100 : null;
      plannedTotal += plannedCost;
      actualTotal += actualCost;
      computed += 1;
    } else {
      if (plannedCost != null) plannedTotal += plannedCost;
      if (hasInvoices) actualTotal += actualCost;
    }

    if (plannedPriceEntry) withPlannedPrice += 1;

    rows.push({
      productId,
      productName,
      plannedQty: p.qty,
      plannedUnit,
      plannedUnitPrice,
      plannedCost,
      plannedPriceSource: plannedPriceEntry?.source || null,
      actualQty: actualQtyInPlannedUnit,
      actualUnitCost,
      actualCost,
      variance,
      variancePct,
      flags,
    });
  }

  // Sort: biggest absolute variance first
  rows.sort((a, b) => Math.abs(b.variance || 0) - Math.abs(a.variance || 0));

  const varianceTotal = actualTotal - plannedTotal;

  return {
    plannedTotal,
    actualTotal,
    varianceTotal,
    rows,
    coverage: {
      totalProductsInPlan: plannedByProduct.size,
      withInvoices,
      withPlannedPrice,
      computed,
      unitMismatch,
    },
  };
}
