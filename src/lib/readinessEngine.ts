/**
 * TRUST LAYER: canonical readiness math
 *
 * Fixes the common bug: inventory has multiple rows per product (lots/bins/partial deliveries)
 * but UI code accidentally uses .find() and only counts the first row.
 *
 * This engine:
 * - Builds canonical indexes for On Hand and On Order
 * - Computes readiness per planned usage item
 * - Returns explainable breakdown data you can show in the UI
 */

export type Unit = "lb" | "gal" | "ton" | "oz" | "qt" | "pt" | "each" | "bag" | "jug" | "case" | "tote" | string;

export type ReadinessStatus = "READY" | "ON_ORDER" | "BLOCKING";

export type InventoryRow = any;

export type OrderRow = any;

export type PlannedUsage = {
  id: string;
  label: string;
  productId: string;
  requiredQty: number;
  plannedUnit: Unit;
  crop?: string;
  passName?: string;
  when?: string;
};

export type ReadinessExplain = {
  productId: string;
  plannedUnit: Unit;
  requiredQty: number;
  onHandQty: number;
  onOrderQty: number;
  shortQty: number;
  inventoryRows: InventoryRow[];
  orderLines: Array<{
    orderId: string;
    vendorName?: string;
    status?: string;
    remainingQty: number;
    unit?: Unit;
  }>;
};

export type ReadinessItem = PlannedUsage & {
  status: ReadinessStatus;
  onHandQty: number;
  onOrderQty: number;
  shortQty: number;
  explain: ReadinessExplain;
};

export type ReadinessSummary = {
  readyCount: number;
  onOrderCount: number;
  blockingCount: number;
  totalCount: number;
  items: ReadinessItem[];
};

type Accessors<T> = {
  getProductId: (row: T) => string;
  getQty: (row: T) => number | null | undefined;
  getContainerCount?: (row: T) => number | null | undefined;
  getUnit?: (row: T) => Unit | null | undefined;
};

export function indexOnHandByProduct<T = InventoryRow>(
  inventoryRows: T[],
  accessors: Accessors<T>
): Map<string, { qtySum: number; rows: T[] }> {
  const map = new Map<string, { qtySum: number; rows: T[] }>();

  for (const row of inventoryRows || []) {
    const productId = accessors.getProductId(row);
    if (!productId) continue;

    const rawQty = accessors.getQty(row);
    const containerCount = accessors.getContainerCount?.(row);

    const qty = Number.isFinite(rawQty as number)
      ? Number(rawQty)
      : Number.isFinite(containerCount as number)
        ? Number(containerCount)
        : 0;

    const current = map.get(productId);
    if (!current) {
      map.set(productId, { qtySum: qty, rows: [row] });
    } else {
      current.qtySum += qty;
      current.rows.push(row);
    }
  }

  return map;
}

export function indexOnOrderByProduct<T = OrderRow>(opts: {
  orders: T[];
  getOrderId: (order: T) => string;
  getOrderStatus?: (order: T) => string | null | undefined;
  isOrderOpen?: (order: T) => boolean;
  getVendorName?: (order: T) => string | null | undefined;
  getLines: (order: T) => any[];
  getLineProductId: (line: any) => string;
  getLineRemainingQty: (line: any) => number | null | undefined;
  getLineUnit?: (line: any) => Unit | null | undefined;
}): Map<string, { qtySum: number; lines: ReadinessExplain["orderLines"] }> {
  const {
    orders,
    getOrderId,
    getOrderStatus,
    isOrderOpen,
    getVendorName,
    getLines,
    getLineProductId,
    getLineRemainingQty,
    getLineUnit,
  } = opts;

  const map = new Map<string, { qtySum: number; lines: ReadinessExplain["orderLines"] }>();

  for (const order of orders || []) {
    const open =
      typeof isOrderOpen === "function"
        ? isOrderOpen(order)
        : (() => {
            const s = (getOrderStatus?.(order) || "").toUpperCase();
            return !["CLOSED", "CANCELLED", "CANCELED", "RECEIVED", "COMPLETE", "COMPLETED", "DELIVERED"].includes(s);
          })();

    if (!open) continue;

    const orderId = getOrderId(order);
    const vendorName = getVendorName?.(order) || undefined;
    const status = getOrderStatus?.(order) || undefined;
    const lines = getLines(order) || [];

    for (const line of lines) {
      const productId = getLineProductId(line);
      if (!productId) continue;

      const remRaw = getLineRemainingQty(line);
      const remainingQty = Number.isFinite(remRaw as number) ? Number(remRaw) : 0;
      if (remainingQty <= 0) continue;

      const unit = getLineUnit?.(line) || undefined;

      const entry = map.get(productId) || { qtySum: 0, lines: [] as ReadinessExplain["orderLines"] };
      entry.qtySum += remainingQty;
      entry.lines.push({ orderId, vendorName, status, remainingQty, unit });
      map.set(productId, entry);
    }
  }

  return map;
}

export function computeReadiness(params: {
  planned: PlannedUsage[];
  inventory: InventoryRow[];
  orders?: OrderRow[];
  inventoryAccessors: Accessors<InventoryRow>;
  orderAccessors?: Parameters<typeof indexOnOrderByProduct<OrderRow>>[0];
}): ReadinessSummary {
  const { planned, inventory, orders, inventoryAccessors, orderAccessors } = params;

  const onHandIndex = indexOnHandByProduct(inventory || [], inventoryAccessors);

  const onOrderIndex =
    orders && orderAccessors
      ? indexOnOrderByProduct({ ...orderAccessors, orders })
      : new Map<string, { qtySum: number; lines: ReadinessExplain["orderLines"] }>();

  const items: ReadinessItem[] = (planned || []).map((p) => {
    const onHand = onHandIndex.get(p.productId)?.qtySum ?? 0;
    const invRows = onHandIndex.get(p.productId)?.rows ?? [];
    const onOrder = onOrderIndex.get(p.productId)?.qtySum ?? 0;
    const orderLines = onOrderIndex.get(p.productId)?.lines ?? [];

    const required = Number.isFinite(p.requiredQty) ? p.requiredQty : 0;

    let status: ReadinessStatus = "BLOCKING";
    if (onHand >= required) status = "READY";
    else if (onHand + onOrder >= required) status = "ON_ORDER";

    const shortQty = Math.max(0, required - (onHand + onOrder));

    const explain: ReadinessExplain = {
      productId: p.productId,
      plannedUnit: p.plannedUnit,
      requiredQty: required,
      onHandQty: onHand,
      onOrderQty: onOrder,
      shortQty,
      inventoryRows: invRows,
      orderLines,
    };

    return {
      ...p,
      status,
      onHandQty: onHand,
      onOrderQty: onOrder,
      shortQty,
      explain,
    };
  });

  const readyCount = items.filter((i) => i.status === "READY").length;
  const onOrderCount = items.filter((i) => i.status === "ON_ORDER").length;
  const blockingCount = items.filter((i) => i.status === "BLOCKING").length;

  return {
    readyCount,
    onOrderCount,
    blockingCount,
    totalCount: items.length,
    items,
  };
}
