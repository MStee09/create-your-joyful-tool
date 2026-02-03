// ============================================================================
// planReadinessUtils.ts - Uses the trust engine for Dashboard readiness widget
// ============================================================================

import type { Season, Product, InventoryItem } from '@/types/farm';
import type { SimplePurchase, SimplePurchaseLine } from '@/types/simplePurchase';
import { calculatePlannedUsage, type PlannedUsageItem } from '@/lib/calculations';
import { computeReadiness, type PlannedUsage } from '@/lib/readinessEngine';

export interface ReadinessSummary {
  totalProducts: number;
  readyCount: number;
  onOrderCount: number;
  blockingCount: number;
  readyPct: number;
  onOrderPct: number;
  blockingPct: number;
  // Value-based metrics
  onHandValue: number;
  onOrderValue: number;
  plannedValue: number;
  shortValue: number;
  coveragePct: number;
  // Volume-based totals
  onHandQtyTotal: number;
  onOrderQtyTotal: number;
  plannedQtyTotal: number;
}

export function calculateReadinessSummary(
  season: Season | null,
  products: Product[],
  inventory: InventoryItem[],
  purchases: SimplePurchase[] = []
): ReadinessSummary {
  const scopedPurchases = (purchases || []).filter(p => {
    if (season?.id && p.seasonId !== season.id) return false;
    return p.status === 'ordered';
  });

  const plannedUsage = calculatePlannedUsage(season, products);

  const plannedForEngine: PlannedUsage[] = plannedUsage.map((u: PlannedUsageItem) => {
    const product = products.find(p => p.id === u.productId);
    return {
      id: u.productId,
      label: product?.name || 'Unknown product',
      productId: u.productId,
      requiredQty: u.totalNeeded,
      plannedUnit: u.unit,
      crop: u.usages?.[0]?.cropName,
      passName: u.usages?.[0]?.timingName,
      when: undefined,
    };
  });

  // Adapt SimplePurchase to work with the readiness engine's order accessors
  const readiness = computeReadiness({
    planned: plannedForEngine,
    inventory,
    orders: scopedPurchases,
    inventoryAccessors: {
      getProductId: (row: InventoryItem) => row.productId,
      getQty: (row: InventoryItem) => row.quantity,
      getContainerCount: (row: InventoryItem) => row.containerCount,
    },
    orderAccessors: {
      orders: scopedPurchases,
      getOrderId: (p: SimplePurchase) => p.id,
      getOrderStatus: (p: SimplePurchase) => p.status,
      getVendorName: () => undefined, // dashboard doesn't need vendor names
      getLines: (p: SimplePurchase) => p.lines || [],
      getLineProductId: (l: SimplePurchaseLine) => l.productId,
      // For 'ordered' purchases, the remaining qty is the total quantity (not yet received)
      // For 'received' purchases, they're already in inventory, so 0 remaining on order
      getLineRemainingQty: (l: SimplePurchaseLine) => l.totalQuantity || (l.quantity * (l.packageSize || 1)),
      getLineUnit: (l: SimplePurchaseLine) => l.packageUnit || l.normalizedUnit,
    },
  });

  const totalProducts = readiness.totalCount || 0;
  const total = totalProducts || 1;

  // Build index of on-order value by product (from actual purchase line prices)
  const onOrderValueByProduct = new Map<string, number>();
  scopedPurchases.forEach(p => {
    (p.lines || []).forEach(line => {
      if (line.productId && line.totalPrice) {
        const current = onOrderValueByProduct.get(line.productId) || 0;
        onOrderValueByProduct.set(line.productId, current + line.totalPrice);
      }
    });
  });

  // Calculate value-based metrics
  let onHandValue = 0;
  let onOrderValue = 0;
  let plannedValue = 0;
  let onHandQtyTotal = 0;
  let onOrderQtyTotal = 0;
  let plannedQtyTotal = 0;

  readiness.items.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    // Use product price for planning/inventory valuation
    const unitPrice = product?.price || 0;

    // On-hand value: use product unit price × quantity
    onHandValue += item.onHandQty * unitPrice;
    
    // On-order value: use ACTUAL purchase line totals (not estimated)
    const actualOrderValue = onOrderValueByProduct.get(item.productId) || 0;
    onOrderValue += actualOrderValue;
    
    // Planned value: use product unit price × required quantity
    plannedValue += item.requiredQty * unitPrice;

    onHandQtyTotal += item.onHandQty;
    onOrderQtyTotal += item.onOrderQty;
    plannedQtyTotal += item.requiredQty;
  });

  const shortValue = Math.max(0, plannedValue - onHandValue - onOrderValue);
  const coveragePct = plannedValue > 0 
    ? Math.min(100, ((onHandValue + onOrderValue) / plannedValue) * 100)
    : 100;

  return {
    totalProducts,
    readyCount: readiness.readyCount,
    onOrderCount: readiness.onOrderCount,
    blockingCount: readiness.blockingCount,
    readyPct: (readiness.readyCount / total) * 100,
    onOrderPct: (readiness.onOrderCount / total) * 100,
    blockingPct: (readiness.blockingCount / total) * 100,
    onHandValue,
    onOrderValue,
    plannedValue,
    shortValue,
    coveragePct,
    onHandQtyTotal,
    onOrderQtyTotal,
    plannedQtyTotal,
  };
}
