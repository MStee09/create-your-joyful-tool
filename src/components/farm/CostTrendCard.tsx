import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { CostSnapshot } from '@/hooks/useCostSnapshots';
import { formatCurrency } from '@/lib/calculations';
import { format } from 'date-fns';

interface CostTrendCardProps {
  snapshots: CostSnapshot[];
  currentCostPerAcre: number;
}

/** Cost trend card for CropPlanningView */
export const CostTrendCard: React.FC<CostTrendCardProps> = ({ snapshots, currentCostPerAcre }) => {
  if (snapshots.length === 0) return null;

  const today = format(new Date(), 'MMM d');
  const lastSnapshot = snapshots[snapshots.length - 1];
  const lastIsToday = format(new Date(lastSnapshot.createdAt), 'MMM d') === today;

  // Build data: historical snapshots + current live value (replace today's snapshot if exists)
  const data = snapshots.map(s => ({
    date: s.createdAt,
    label: format(new Date(s.createdAt), 'MMM d'),
    cost: s.costPerAcre,
    reason: s.snapshotReason,
  }));

  // Always ensure the last point reflects the current live cost
  if (lastIsToday) {
    data[data.length - 1] = { ...data[data.length - 1], cost: currentCostPerAcre, reason: 'live' };
  } else {
    data.push({ date: new Date().toISOString(), label: today, cost: currentCostPerAcre, reason: 'live' });
  }

  const first = data[0];
  const delta = data.length >= 2 ? currentCostPerAcre - first.cost : 0;
  const isUp = delta > 0;

  const reasonLabels: Record<string, string> = {
    plan_edit: 'Plan edit',
    price_change: 'Price change',
    purchase_recorded: 'Purchase',
    manual: 'Manual',
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Cost/Acre Trend</h4>
          <p className="text-xs text-muted-foreground">
            {snapshots.length} snapshots since {format(new Date(first.date), 'MMM d')}
          </p>
        </div>
        {Math.abs(delta) >= 0.50 && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
            isUp ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          }`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isUp ? '+' : ''}{formatCurrency(delta)}/ac
          </div>
        )}
      </div>
      <div style={{ width: '100%', height: 100 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
              axisLine={false} 
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
              axisLine={false} 
              tickLine={false}
              width={50}
              tickFormatter={(v) => `$${v}`}
              domain={[(min: number) => Math.floor(min - 5), (max: number) => Math.ceil(max + 5)]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="bg-popover text-popover-foreground border border-border rounded px-2.5 py-1.5 text-xs shadow-md">
                    <div className="font-semibold">{formatCurrency(p.cost)}/ac</div>
                    <div className="text-muted-foreground">{p.label}</div>
                    <div className="text-muted-foreground">{reasonLabels[p.reason] || p.reason}</div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
