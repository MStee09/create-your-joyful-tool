import React from 'react';
import { X, Package, Truck, AlertTriangle, CheckCircle } from 'lucide-react';
import type { ReadinessExplain, ReadinessStatus } from '@/lib/readinessEngine';

interface ExplainMathDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  explain: ReadinessExplain | null;
  status?: ReadinessStatus;
  renderInventoryRow?: (row: any) => React.ReactNode;
  renderOrderRow?: (row: { orderId: string; vendorName?: string; status?: string; remainingQty: number; unit?: string }) => React.ReactNode;
}

export const ExplainMathDrawer: React.FC<ExplainMathDrawerProps> = ({
  open,
  onClose,
  title,
  explain,
  status,
  renderInventoryRow,
  renderOrderRow,
}) => {
  if (!open || !explain) return null;

  // Derive status from explain data if not passed
  const derivedStatus: ReadinessStatus = status ?? (
    explain.onHandQty >= explain.requiredQty ? 'READY' :
    explain.onHandQty + explain.onOrderQty >= explain.requiredQty ? 'ON_ORDER' : 'BLOCKING'
  );

  const statusColors = {
    READY: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle },
    ON_ORDER: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Truck },
    BLOCKING: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: AlertTriangle },
  };

  const colors = statusColors[derivedStatus];
  const StatusIcon = colors.icon;

  const calculationText = buildCalculationString(
    explain.requiredQty,
    explain.onHandQty,
    explain.onOrderQty,
    explain.plannedUnit
  );

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Banner */}
          <div className={`rounded-xl p-4 ${colors.bg} ${colors.border} border`}>
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-5 h-5 ${colors.text}`} />
              <div>
                <p className={`font-semibold ${colors.text}`}>
                  {derivedStatus === 'READY' && 'Ready to Execute'}
                  {derivedStatus === 'ON_ORDER' && 'Covered by On-Order'}
                  {derivedStatus === 'BLOCKING' && 'Blocking - Action Required'}
                </p>
                <p className="text-sm text-stone-600 mt-1">{calculationText}</p>
              </div>
            </div>
          </div>

          {/* Requirement */}
          <div>
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
              Requirement
            </h3>
            <div className="bg-stone-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-stone-600">Planned Usage</span>
                <span className="font-semibold text-stone-800">
                  {fmt(explain.requiredQty)} {explain.plannedUnit}
                </span>
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div>
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              On Hand ({fmt(explain.onHandQty)} {explain.plannedUnit})
            </h3>
            {explain.inventoryRows.length > 0 ? (
              <div className="space-y-2">
                {explain.inventoryRows.map((row, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-stone-200 p-4">
                    {renderInventoryRow ? (
                      renderInventoryRow(row)
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-stone-600">Inventory #{idx + 1}</span>
                        <span className="font-semibold">
                          {fmt(row.quantity ?? row.qty ?? row.on_hand_qty ?? 0)} {explain.plannedUnit}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-stone-50 rounded-xl p-4 text-center text-stone-500">
                No inventory on hand
              </div>
            )}
          </div>

          {/* On Order */}
          <div>
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              On Order ({fmt(explain.onOrderQty)} {explain.plannedUnit})
            </h3>
            {explain.orderLines.length > 0 ? (
              <div className="space-y-2">
                {explain.orderLines.map((line, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-stone-200 p-4">
                    {renderOrderRow ? (
                      renderOrderRow(line)
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-stone-800">{line.vendorName || 'Unknown Vendor'}</div>
                          <div className="text-xs text-stone-500">{line.status || 'Pending'}</div>
                        </div>
                        <span className="font-semibold">
                          {fmt(line.remainingQty)} {line.unit || explain.plannedUnit}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-stone-50 rounded-xl p-4 text-center text-stone-500">
                No pending orders
              </div>
            )}
          </div>

          {/* Summary */}
          {explain.shortQty > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-rose-700 font-medium">Shortfall</span>
                <span className="font-bold text-rose-700">
                  {fmt(explain.shortQty)} {explain.plannedUnit}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

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
