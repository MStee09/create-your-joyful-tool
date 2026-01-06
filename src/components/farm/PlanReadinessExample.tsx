import React, { useMemo, useState } from "react";
import { computeReadiness, type PlannedUsage, type ReadinessExplain, type ReadinessStatus } from "@/lib/readinessEngine";
import { ExplainMathDrawer } from "./ExplainMathDrawer";

export function PlanReadinessExample(props: {
  planUsages: Array<{
    id: string;
    label: string;
    productId: string;
    requiredQty: number;
    unit: string;
    crop?: string;
    passName?: string;
    when?: string;
  }>;
  inventory: any[];
  orders: any[];
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerExplain, setDrawerExplain] = useState<ReadinessExplain | null>(null);
  const [drawerStatus, setDrawerStatus] = useState<ReadinessStatus>("BLOCKING");

  const planned: PlannedUsage[] = useMemo(
    () =>
      props.planUsages.map((u) => ({
        id: u.id,
        label: u.label,
        productId: u.productId,
        requiredQty: u.requiredQty,
        plannedUnit: u.unit,
        crop: u.crop,
        passName: u.passName,
        when: u.when,
      })),
    [props.planUsages]
  );

  const summary = useMemo(() => {
    return computeReadiness({
      planned,
      inventory: props.inventory,
      orders: props.orders,
      inventoryAccessors: {
        getProductId: (row) => row.productId ?? row.product_id ?? row.product_master_id,
        getQty: (row) => row.quantity ?? row.qty ?? row.on_hand_qty,
        getContainerCount: (row) => row.containerCount ?? row.container_count,
      },
      orderAccessors: {
        orders: props.orders,
        getOrderId: (o) => o.id ?? o.orderId ?? o.order_id,
        getOrderStatus: (o) => o.status ?? o.state,
        getVendorName: (o) => o.vendorName ?? o.vendor_name,
        getLines: (o) => o.lines ?? o.lineItems ?? o.line_items ?? o.items ?? [],
        getLineProductId: (l) => l.productId ?? l.product_id ?? l.product_master_id,
        getLineRemainingQty: (l) => l.remainingQty ?? l.remaining_qty ?? l.qty_remaining ?? l.quantity,
        getLineUnit: (l) => l.unit ?? l.uom,
      },
    });
  }, [planned, props.inventory, props.orders]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Ready" value={summary.readyCount} />
        <Stat label="On Order" value={summary.onOrderCount} />
        <Stat label="Blocking" value={summary.blockingCount} />
        <Stat label="Total" value={summary.totalCount} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="grid grid-cols-12 bg-neutral-50 px-4 py-3 text-xs font-semibold text-neutral-600">
          <div className="col-span-4">Item</div>
          <div className="col-span-2">Need</div>
          <div className="col-span-2">On hand</div>
          <div className="col-span-2">On order</div>
          <div className="col-span-2">Action</div>
        </div>

        <div className="divide-y divide-neutral-200">
          {summary.items.map((it) => (
            <div key={it.id} className="grid grid-cols-12 px-4 py-3 text-sm text-neutral-800">
              <div className="col-span-4">
                <div className="font-semibold">{it.label}</div>
                <div className="text-xs text-neutral-500">
                  {it.crop ? `${it.crop} • ` : ""}{it.passName ? `${it.passName} • ` : ""}{it.when || ""}
                </div>
                <div className="mt-1">
                  <StatusPill status={it.status} />
                </div>
              </div>
              <div className="col-span-2">{fmt(it.requiredQty)} {it.plannedUnit}</div>
              <div className="col-span-2">{fmt(it.onHandQty)} {it.plannedUnit}</div>
              <div className="col-span-2">{fmt(it.onOrderQty)} {it.plannedUnit}</div>
              <div className="col-span-2">
                <button
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50"
                  onClick={() => {
                    setDrawerTitle(it.label);
                    setDrawerExplain(it.explain);
                    setDrawerStatus(it.status);
                    setDrawerOpen(true);
                  }}
                >
                  Explain
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ExplainMathDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        explain={drawerExplain}
        status={drawerStatus}
        renderInventoryRow={(row) => (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-semibold text-neutral-900">
                {row.location ?? row.bin ?? row.storage ?? row.packaging_name ?? "Inventory row"}
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {row.lot ? `Lot: ${row.lot}` : ""}{row.receivedAt ?? row.created_at ? ` • Received: ${row.receivedAt ?? row.created_at}` : ""}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-semibold text-neutral-900">{fmt(row.quantity ?? row.qty ?? row.on_hand_qty ?? 0)}</div>
              <div className="text-xs text-neutral-500">{row.unit ?? row.uom ?? ""}</div>
            </div>
          </div>
        )}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: "READY" | "ON_ORDER" | "BLOCKING" }) {
  const cls =
    status === "READY"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : status === "ON_ORDER"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-rose-50 text-rose-800 border-rose-200";
  const label = status === "READY" ? "Ready" : status === "ON_ORDER" ? "On order" : "Blocking";
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  const r = Math.round(n * 100) / 100;
  return r.toLocaleString();
}
