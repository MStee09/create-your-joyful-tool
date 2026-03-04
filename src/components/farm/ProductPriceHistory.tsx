import React, { useMemo, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Scatter,
  ComposedChart,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency } from '@/lib/calculations';
import type { ProductMaster, Vendor, VendorOffering } from '@/types';
import type { PriceRecord, NewPriceRecord } from '@/types/priceRecord';
import { LogQuoteModal } from './LogQuoteModal';

interface ProductPriceHistoryProps {
  product: ProductMaster;
  priceRecords: PriceRecord[];
  vendors: Vendor[];
  currentSeasonYear: number;
  onAddPriceRecord: (record: NewPriceRecord) => Promise<any>;
  vendorOfferings?: VendorOffering[];
  onUpdateOfferings?: (offerings: VendorOffering[]) => void;
}

const VENDOR_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899',
];

export const ProductPriceHistory: React.FC<ProductPriceHistoryProps> = ({
  product,
  priceRecords,
  vendors,
  currentSeasonYear,
  onAddPriceRecord,
  vendorOfferings,
  onUpdateOfferings,
}) => {
  const [showLogQuote, setShowLogQuote] = useState(false);
  const [tableOpen, setTableOpen] = useState(true);

  const productRecords = useMemo(() => {
    return priceRecords
      .filter(r => r.productId === product.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [priceRecords, product.id]);

  const recentPrices = useMemo(() => {
    return [...productRecords].reverse().slice(0, 8);
  }, [productRecords]);

  // Chart: one data point per record, plotted by actual date
  const { chartData, chartVendors, vendorColorMap } = useMemo(() => {
    const vendorIds = [...new Set(productRecords.map(r => r.vendorId))];
    const vList = vendorIds.map(id => vendors.find(v => v.id === id)).filter(Boolean) as Vendor[];
    const colorMap: Record<string, string> = {};
    vList.forEach((v, i) => { colorMap[v.id] = VENDOR_COLORS[i % VENDOR_COLORS.length]; });

    const data = productRecords.map(r => {
      const d = new Date(r.date);
      const ts = d.getTime();
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const point: Record<string, any> = { ts, dateLabel: label };
      // Put price in vendor-specific key
      point[r.vendorId] = r.normalizedPrice;
      // Mark type for dot styling
      point[`${r.vendorId}_type`] = r.type;
      return point;
    });

    return { chartData: data, chartVendors: vList, vendorColorMap: colorMap };
  }, [productRecords, vendors]);

  const priceChange = useMemo(() => {
    const purchased = productRecords.filter(r => r.type === 'purchased');
    if (purchased.length < 2) return null;
    const oldest = purchased[0];
    const newest = purchased[purchased.length - 1];
    const yearDiff = (new Date(newest.date).getTime() - new Date(oldest.date).getTime()) / (365.25 * 86400000);
    if (yearDiff < 0.5) return null;
    const amount = newest.normalizedPrice - oldest.normalizedPrice;
    const percent = (amount / oldest.normalizedPrice) * 100;
    const years = Math.round(yearDiff);
    return { amount, percent, years };
  }, [productRecords]);

  const getVendorName = (vendorId: string) => 
    vendors.find(v => v.id === vendorId)?.name || 'Unknown';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Custom dot renderer: filled for purchased, hollow for quote
  const renderDot = (vendorId: string, color: string) => (props: any) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || payload[vendorId] == null) return null;
    const isPurchased = payload[`${vendorId}_type`] === 'purchased';
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isPurchased ? 5 : 4}
        fill={isPurchased ? color : 'hsl(var(--card))'}
        stroke={color}
        strokeWidth={2}
      />
    );
  };

  const logQuoteModal = (
    <LogQuoteModal
      isOpen={showLogQuote}
      onClose={() => setShowLogQuote(false)}
      onSave={onAddPriceRecord}
      products={[product]}
      vendors={vendors}
      currentSeasonYear={currentSeasonYear}
      preselectedProductId={product.id}
      vendorOfferings={vendorOfferings}
      onUpdateOfferings={onUpdateOfferings}
    />
  );

  if (productRecords.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Price History</h3>
          <Button variant="outline" size="sm" onClick={() => setShowLogQuote(true)}>
            <Plus className="w-4 h-4 mr-1" /> Update Price
          </Button>
        </div>
        <p className="text-muted-foreground text-center py-8">
          No price history yet. Record purchases or log quotes to track pricing.
        </p>
        {logQuoteModal}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Price History</h3>
        <Button variant="outline" size="sm" onClick={() => setShowLogQuote(true)}>
          <Plus className="w-4 h-4 mr-1" /> Update Price
        </Button>
      </div>

      {/* Hero Chart */}
      <div className="h-72 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
              width={55}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                const vendor = chartVendors.find(v => v.id === name);
                return [formatCurrency(value), vendor?.name || name];
              }}
              labelFormatter={(label) => label}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            />
            {chartVendors.length > 1 && <Legend formatter={(value) => {
              const vendor = chartVendors.find(v => v.id === value);
              return vendor?.name || value;
            }} />}
            {chartVendors.map((vendor) => (
              <Line
                key={vendor.id}
                type="monotone"
                dataKey={vendor.id}
                name={vendor.id}
                stroke={vendorColorMap[vendor.id]}
                strokeWidth={2}
                dot={renderDot(vendor.id, vendorColorMap[vendor.id])}
                connectNulls
                activeDot={{ r: 6 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend for dot styles */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" /> Purchased
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-emerald-500 bg-card" /> Quote
        </span>
      </div>

      {/* Price Change Summary */}
      {priceChange && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
          {priceChange.percent > 0 ? (
            <TrendingUp className="w-4 h-4 text-red-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-emerald-500" />
          )}
          <span className="text-sm">
            {priceChange.years}-Year Change:{' '}
            <span className={priceChange.percent > 0 ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
              {priceChange.percent > 0 ? '+' : ''}{formatCurrency(priceChange.amount)}/{product.form === 'liquid' ? 'gal' : 'lb'}{' '}
              ({priceChange.percent > 0 ? '+' : ''}{priceChange.percent.toFixed(1)}%)
            </span>
          </span>
        </div>
      )}

      {/* Collapsible Recent Prices Table */}
      <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 group">
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${tableOpen ? 'rotate-90' : ''}`} />
          <h4 className="text-sm font-medium text-muted-foreground">
            Recent Prices ({recentPrices.length})
          </h4>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border border-border rounded-lg overflow-hidden mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Vendor</th>
                  <th className="text-right px-3 py-2 font-medium">Price</th>
                  <th className="text-left px-3 py-2 font-medium">Package</th>
                  <th className="text-center px-3 py-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentPrices.map(record => (
                  <tr key={record.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(record.date)}</td>
                    <td className="px-3 py-2">{getVendorName(record.vendorId)}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatCurrency(record.normalizedPrice)}/{record.unit}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{record.packageType || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      {record.type === 'purchased' ? (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">✓ Purchased</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Quote</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {logQuoteModal}
    </div>
  );
};
