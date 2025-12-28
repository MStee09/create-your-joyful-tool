import type { Season, Product, InventoryItem } from '@/types/farm';
import { calculatePlannedUsage } from '@/lib/calculations';

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
  inventory: InventoryItem[]
): ReadinessSummary {
  const plannedUsage = calculatePlannedUsage(season, products);
  
  let readyCount = 0;
  let blockingCount = 0;
  const onOrderCount = 0; // Future feature
  
  plannedUsage.forEach(usage => {
    const invItem = inventory.find(i => i.productId === usage.productId);
    const onHand = invItem?.quantity || 0;
    const remaining = onHand - usage.totalNeeded;
    
    if (remaining < 0) {
      blockingCount++;
    } else {
      readyCount++;
    }
  });
  
  const totalProducts = plannedUsage.length;
  const total = totalProducts || 1;
  
  return {
    totalProducts,
    readyCount,
    onOrderCount,
    blockingCount,
    readyPct: (readyCount / total) * 100,
    onOrderPct: (onOrderCount / total) * 100,
    blockingPct: (blockingCount / total) * 100,
  };
}
