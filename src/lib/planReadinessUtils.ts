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

  return {
    totalProducts,
    readyCount: readiness.readyCount,
    onOrderCount: readiness.onOrderCount,
    blockingCount: readiness.blockingCount,
    readyPct: (readiness.readyCount / total) * 100,
    onOrderPct: (readiness.onOrderCount / total) * 100,
    blockingPct: (readiness.blockingCount / total) * 100,
  };
}
