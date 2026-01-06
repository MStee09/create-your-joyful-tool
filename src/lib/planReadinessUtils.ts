// ============================================================================
// planReadinessUtils.ts - Uses the trust engine for Dashboard readiness widget
// ============================================================================

import type { Season, Product, InventoryItem } from '@/types/farm';
import type { Order } from '@/types/orderInvoice';
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
  orders: Order[] = []
): ReadinessSummary {
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

  const readiness = computeReadiness({
    planned: plannedForEngine,
    inventory,
    orders,
    inventoryAccessors: {
      getProductId: (row: InventoryItem) => row.productId,
      getQty: (row: InventoryItem) => row.quantity,
      getContainerCount: (row: InventoryItem) => row.containerCount,
    },
    orderAccessors: {
      orders,
      getOrderId: (o: Order) => o.id,
      getOrderStatus: (o: Order) => o.status,
      getVendorName: () => undefined, // dashboard doesn't need vendor names
      getLines: (o: Order) => o.lineItems || [],
      getLineProductId: (l: any) => l.productId,
      // IMPORTANT: fallback if remainingQuantity isn't stored
      getLineRemainingQty: (l: any) =>
        l.remainingQuantity ?? (Number(l.orderedQuantity || 0) - Number(l.receivedQuantity || 0)),
      getLineUnit: (l: any) => l.unit,
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
