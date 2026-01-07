// Calculates variance by Crop/Pass - allocates actual cost proportionally

import type { Season, Product } from '@/types/farm';
import type { Invoice } from '@/types/orderInvoice';
import type { PriceBookEntry } from '@/types';
import { calculatePlannedUsage } from '@/lib/calculations';

type PassKey = string;

export type PassVarianceRow = {
  cropName: string;
  timingName: string;

  plannedCost: number | null;
  actualCostAllocated: number;
  variance: number | null;
  variancePct: number | null;

  flags: {
    missingPlannedPrice?: boolean;
    noInvoices?: boolean;
  };
};

export type PassVarianceSummary = {
  plannedTotal: number;
  actualTotalAllocated: number;
  varianceTotal: number;
  rows: PassVarianceRow[];
};

const toNum = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);

function normalizeUom(u?: string) {
  const x = (u || '').toLowerCase();
  if (x === 'lb' || x === 'lbs') return 'lbs';
  if (x === 'ton' || x === 'tons') return 'ton';
  if (x === 'gal' || x === 'gallon' || x === 'gallons') return 'gal';
  return u || '';
}

function convertPriceToUnit(opts: { price: number; priceUom: string; targetUom: string }): number | null {
  const price = toNum(opts.price);
  const from = normalizeUom(opts.priceUom);
  const to = normalizeUom(opts.targetUom);
  if (!price || !from || !to) return null;
  if (from === to) return price;

  // ton <-> lbs conversion
  if (from === 'ton' && to === 'lbs') return price / 2000;
  if (from === 'lbs' && to === 'ton') return price * 2000;

  // No gal<->lbs without density
  return null;
}

function getPlannedPriceEntry(productId: string, seasonYear: number, priceBook: PriceBookEntry[]): PriceBookEntry | null {
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

export function buildVarianceByPassReport(opts: {
  season: Season | null;
  products: Product[];
  invoices: Invoice[];
  priceBook: PriceBookEntry[];
}): PassVarianceSummary {
  const { season, products, invoices, priceBook } = opts;
  const seasonYear = season?.year || new Date().getFullYear();

  const plannedUsage = calculatePlannedUsage(season as any, products as any);

  // Actual totals by product (dollars)
  const actualCostByProduct = new Map<string, number>();
  for (const inv of invoices || []) {
    if (inv.seasonYear !== seasonYear) continue;
    for (const li of inv.lineItems || []) {
      if (!li.productId) continue;
      const landed = toNum(li.landedTotal) || (toNum(li.landedUnitCost) * toNum(li.quantity));
      actualCostByProduct.set(li.productId, (actualCostByProduct.get(li.productId) || 0) + landed);
    }
  }

  // Pass rows keyed by crop+timing
  const passMap = new Map<PassKey, PassVarianceRow>();

  const ensureRow = (cropName: string, timingName: string) => {
    const key = `${cropName}::${timingName}`;
    if (!passMap.has(key)) {
      passMap.set(key, {
        cropName,
        timingName,
        plannedCost: 0,
        actualCostAllocated: 0,
        variance: 0,
        variancePct: 0,
        flags: {},
      });
    }
    return passMap.get(key)!;
  };

  let plannedTotal = 0;
  let actualTotalAllocated = 0;

  for (const pu of plannedUsage) {
    const productId = pu.productId;
    const totalPlannedQty = toNum(pu.totalNeeded);
    const plannedUnit = normalizeUom(pu.unit);

    const priceEntry = getPlannedPriceEntry(productId, seasonYear, priceBook);
    const pricePerPlannedUnit =
      priceEntry
        ? convertPriceToUnit({ price: toNum(priceEntry.price), priceUom: String(priceEntry.priceUom || ''), targetUom: plannedUnit })
        : null;

    const plannedCostProduct =
      pricePerPlannedUnit != null ? totalPlannedQty * pricePerPlannedUnit : null;

    const actualCostProduct = actualCostByProduct.get(productId) || 0;
    const hasInvoices = actualCostProduct > 0;

    // Allocate actual cost by planned usage proportions
    const usages = pu.usages || [];
    for (const u of usages) {
      const row = ensureRow(u.cropName, u.timingName);

      const usageQty = toNum(u.quantityNeeded);
      const share = totalPlannedQty > 0 ? (usageQty / totalPlannedQty) : 0;

      // Planned
      if (plannedCostProduct != null) {
        const plannedCostThisPass = plannedCostProduct * share;
        row.plannedCost = (row.plannedCost || 0) + plannedCostThisPass;
        plannedTotal += plannedCostThisPass;
      } else {
        row.flags.missingPlannedPrice = true;
        row.plannedCost = null;
      }

      // Actual (allocated)
      if (hasInvoices) {
        const actualThisPass = actualCostProduct * share;
        row.actualCostAllocated += actualThisPass;
        actualTotalAllocated += actualThisPass;
      } else {
        row.flags.noInvoices = true;
      }
    }
  }

  const rows = Array.from(passMap.values()).map(r => {
    if (r.plannedCost == null) {
      return { ...r, variance: null, variancePct: null };
    }
    const variance = r.actualCostAllocated - r.plannedCost;
    const variancePct = r.plannedCost > 0 ? (variance / r.plannedCost) * 100 : null;
    return { ...r, variance, variancePct };
  });

  rows.sort((a, b) => Math.abs((b.variance || 0)) - Math.abs((a.variance || 0)));

  return {
    plannedTotal,
    actualTotalAllocated,
    varianceTotal: actualTotalAllocated - plannedTotal,
    rows,
  };
}
