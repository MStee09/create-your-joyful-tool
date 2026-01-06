/**
 * Readiness Engine - Calculates inventory readiness for planned usage
 */

export type ReadinessStatus = 'READY' | 'ON_ORDER' | 'BLOCKING';

export interface PlannedUsage {
  id: string;
  label: string;
  productId: string;
  requiredQty: number;
  plannedUnit: string;
  crop?: string;
  passName?: string;
  when?: string;
}

export interface ReadinessItem {
  id: string;
  label: string;
  productId: string;
  requiredQty: number;
  plannedUnit: string;
  crop?: string;
  passName?: string;
  when?: string;
  status: ReadinessStatus;
  onHandQty: number;
  onOrderQty: number;
  shortfall: number;
  explain: ReadinessExplanation;
}

export interface ReadinessExplanation {
  requiredQty: number;
  unit: string;
  inventoryRows: any[];
  inventoryTotal: number;
  orderRows: any[];
  orderTotal: number;
  shortfall: number;
  status: ReadinessStatus;
  calculation: string;
}

export interface ReadinessSummary {
  totalCount: number;
  readyCount: number;
  onOrderCount: number;
  blockingCount: number;
  readyPct: number;
  onOrderPct: number;
  blockingPct: number;
  items: ReadinessItem[];
}

export interface InventoryAccessors<T> {
  getProductId: (row: T) => string;
  getQty: (row: T) => number;
  getContainerCount?: (row: T) => number | undefined;
}

export interface OrderAccessors<O, L> {
  orders: O[];
  getOrderId: (order: O) => string;
  getOrderStatus: (order: O) => string;
  getVendorName: (order: O) => string;
  getLines: (order: O) => L[];
  getLineProductId: (line: L) => string;
  getLineRemainingQty: (line: L) => number;
  getLineUnit: (line: L) => string;
}

export interface ComputeReadinessParams<I, O, L> {
  planned: PlannedUsage[];
  inventory: I[];
  orders?: O[];
  inventoryAccessors: InventoryAccessors<I>;
  orderAccessors?: OrderAccessors<O, L>;
}

export function computeReadiness<I, O, L>(
  params: ComputeReadinessParams<I, O, L>
): ReadinessSummary {
  const { planned, inventory, inventoryAccessors, orderAccessors } = params;

  const items: ReadinessItem[] = planned.map((usage) => {
    // Find matching inventory rows
    const inventoryRows = inventory.filter(
      (row) => inventoryAccessors.getProductId(row) === usage.productId
    );
    const inventoryTotal = inventoryRows.reduce(
      (sum, row) => sum + (inventoryAccessors.getQty(row) || 0),
      0
    );

    // Find matching order lines
    let orderRows: { order: O; line: L; vendorName: string }[] = [];
    let orderTotal = 0;

    if (orderAccessors) {
      orderAccessors.orders.forEach((order) => {
        const status = orderAccessors.getOrderStatus(order);
        // Only count orders that are pending/confirmed, not delivered
        if (status === 'delivered' || status === 'cancelled') return;

        const lines = orderAccessors.getLines(order);
        lines.forEach((line) => {
          if (orderAccessors.getLineProductId(line) === usage.productId) {
            const remainingQty = orderAccessors.getLineRemainingQty(line) || 0;
            if (remainingQty > 0) {
              orderRows.push({
                order,
                line,
                vendorName: orderAccessors.getVendorName(order),
              });
              orderTotal += remainingQty;
            }
          }
        });
      });
    }

    // Calculate status
    const totalAvailable = inventoryTotal + orderTotal;
    const shortfall = Math.max(0, usage.requiredQty - totalAvailable);

    let status: ReadinessStatus;
    if (inventoryTotal >= usage.requiredQty) {
      status = 'READY';
    } else if (totalAvailable >= usage.requiredQty) {
      status = 'ON_ORDER';
    } else {
      status = 'BLOCKING';
    }

    // Build explanation
    const explain: ReadinessExplanation = {
      requiredQty: usage.requiredQty,
      unit: usage.plannedUnit,
      inventoryRows,
      inventoryTotal,
      orderRows,
      orderTotal,
      shortfall,
      status,
      calculation: buildCalculationString(
        usage.requiredQty,
        inventoryTotal,
        orderTotal,
        usage.plannedUnit
      ),
    };

    return {
      id: usage.id,
      label: usage.label,
      productId: usage.productId,
      requiredQty: usage.requiredQty,
      plannedUnit: usage.plannedUnit,
      crop: usage.crop,
      passName: usage.passName,
      when: usage.when,
      status,
      onHandQty: inventoryTotal,
      onOrderQty: orderTotal,
      shortfall,
      explain,
    };
  });

  // Calculate counts
  const readyCount = items.filter((i) => i.status === 'READY').length;
  const onOrderCount = items.filter((i) => i.status === 'ON_ORDER').length;
  const blockingCount = items.filter((i) => i.status === 'BLOCKING').length;
  const totalCount = items.length;
  const total = totalCount || 1;

  return {
    totalCount,
    readyCount,
    onOrderCount,
    blockingCount,
    readyPct: (readyCount / total) * 100,
    onOrderPct: (onOrderCount / total) * 100,
    blockingPct: (blockingCount / total) * 100,
    items,
  };
}

function buildCalculationString(
  required: number,
  onHand: number,
  onOrder: number,
  unit: string
): string {
  const total = onHand + onOrder;
  const diff = total - required;

  if (diff >= 0) {
    return `Need ${fmt(required)} ${unit}. Have ${fmt(onHand)} on hand${
      onOrder > 0 ? ` + ${fmt(onOrder)} on order` : ''
    } = ${fmt(total)} ${unit}. ✓ Covered by ${fmt(diff)} ${unit}`;
  } else {
    return `Need ${fmt(required)} ${unit}. Have ${fmt(onHand)} on hand${
      onOrder > 0 ? ` + ${fmt(onOrder)} on order` : ''
    } = ${fmt(total)} ${unit}. ✗ Short ${fmt(Math.abs(diff))} ${unit}`;
  }
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 100) / 100;
  return r.toLocaleString();
}
