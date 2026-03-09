import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { CostSnapshot } from '@/hooks/useCostSnapshots';
import { formatCurrency } from '@/lib/calculations';
import { format } from 'date-fns';

interface CostTrendSparklineProps {
  snapshots: CostSnapshot[];
  currentCostPerAcre: number;
  width?: number;
  height?: number;
}

/** Mini sparkline for the Dashboard crop cost table */
export const CostTrendSparkline: React.FC<CostTrendSparklineProps> = ({
  snapshots,
  currentCostPerAcre,
  width = 80,
  height = 24,
}) => {
  if (snapshots.length === 0) {
    return null;
  }

  const data = snapshots.map(s => ({
    date: s.createdAt,
    cost: s.costPerAcre,
  }));

  // Compare current to previous snapshot
  const prev = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;
  const delta = prev ? currentCostPerAcre - prev.costPerAcre : 0;

  return (
    <div className="flex items-center gap-1.5">
      <div style={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="cost"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              dot={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="bg-popover text-popover-foreground border border-border rounded px-2 py-1 text-xs shadow-md">
                    <div>{format(new Date(p.date), 'MMM d')}</div>
                    <div className="font-semibold">{formatCurrency(p.cost)}/ac</div>
                  </div>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {Math.abs(delta) >= 0.50 && (
        delta > 0 ? (
          <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
        )
      )}
    </div>
  );
};
