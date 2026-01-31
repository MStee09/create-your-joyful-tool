import React, { useMemo, useState } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/calculations';
import type { ProductMaster, Vendor } from '@/types';
import type { PriceRecord, NewPriceRecord } from '@/types/priceRecord';
import { LogQuoteModal } from './LogQuoteModal';

interface ProductPriceHistoryProps {
  product: ProductMaster;
  priceRecords: PriceRecord[];
  vendors: Vendor[];
  currentSeasonYear: number;
  onAddPriceRecord: (record: NewPriceRecord) => Promise<any>;
}

// Colors for different vendors
const VENDOR_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export const ProductPriceHistory: React.FC<ProductPriceHistoryProps> = ({
  product,
  priceRecords,
  vendors,
  currentSeasonYear,
  onAddPriceRecord,
}) => {
  const [showLogQuote, setShowLogQuote] = useState(false);

  // Filter to this product's records
  const productRecords = useMemo(() => {
    return priceRecords
      .filter(r => r.productId === product.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [priceRecords, product.id]);

  // Get recent prices for the table
  const recentPrices = productRecords.slice(0, 8);

  // Prepare chart data (show last 4 years)
  const chartData = useMemo(() => {
    const years = [
      currentSeasonYear - 3,
      currentSeasonYear - 2,
      currentSeasonYear - 1,
      currentSeasonYear,
    ];

    // Get unique vendors in this product's records
    const vendorIds = [...new Set(productRecords.map(r => r.vendorId))];
    
    return years.map(year => {
      const point: Record<string, any> = { year: year.toString() };
      
      vendorIds.forEach(vendorId => {
        // Get most recent price for this vendor in this year
        const yearRecords = productRecords.filter(
          r => r.seasonYear === year && r.vendorId === vendorId && r.type === 'purchased'
        );
        if (yearRecords.length > 0) {
          point[vendorId] = yearRecords[0].normalizedPrice;
        }
      });
      
      return point;
    });
  }, [productRecords, currentSeasonYear]);

  // Get vendors that appear in chart
  const chartVendors = useMemo(() => {
    const vendorIds = [...new Set(productRecords.map(r => r.vendorId))];
    return vendorIds.map(id => vendors.find(v => v.id === id)).filter(Boolean) as Vendor[];
  }, [productRecords, vendors]);

  // Calculate 3-year change
  const priceChange = useMemo(() => {
    const threeYearsAgo = productRecords.find(
      r => r.seasonYear === currentSeasonYear - 3 && r.type === 'purchased'
    );
    const current = productRecords.find(
      r => r.seasonYear === currentSeasonYear && r.type === 'purchased'
    );
    
    if (!threeYearsAgo || !current) return null;
    
    const amount = current.normalizedPrice - threeYearsAgo.normalizedPrice;
    const percent = (amount / threeYearsAgo.normalizedPrice) * 100;
    
    return { amount, percent };
  }, [productRecords, currentSeasonYear]);

  const getVendorName = (vendorId: string) => 
    vendors.find(v => v.id === vendorId)?.name || 'Unknown';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (productRecords.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Price History</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowLogQuote(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Log Quote
          </Button>
        </div>
        <p className="text-muted-foreground text-center py-8">
          No price history yet. Record purchases or log quotes to track pricing.
        </p>

        <LogQuoteModal
          isOpen={showLogQuote}
          onClose={() => setShowLogQuote(false)}
          onSave={onAddPriceRecord}
          products={[product]}
          vendors={vendors}
          currentSeasonYear={currentSeasonYear}
          preselectedProductId={product.id}
        />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Price History</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowLogQuote(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Log Quote
        </Button>
      </div>

      {/* Chart */}
      {chartData.some(d => Object.keys(d).length > 1) && (
        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
                width={50}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Year ${label}`}
              />
              {chartVendors.length > 1 && <Legend />}
              {chartVendors.map((vendor, i) => (
                <Line
                  key={vendor.id}
                  type="monotone"
                  dataKey={vendor.id}
                  name={vendor.name}
                  stroke={VENDOR_COLORS[i % VENDOR_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Price Change Summary */}
      {priceChange && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
          {priceChange.percent > 0 ? (
            <TrendingUp className="w-4 h-4 text-red-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-emerald-500" />
          )}
          <span className="text-sm">
            3-Year Change:{' '}
            <span className={priceChange.percent > 0 ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
              {priceChange.percent > 0 ? '+' : ''}{formatCurrency(priceChange.amount)}/{product.form === 'liquid' ? 'gal' : 'lb'}{' '}
              ({priceChange.percent > 0 ? '+' : ''}{priceChange.percent.toFixed(1)}%)
            </span>
          </span>
        </div>
      )}

      {/* Recent Prices Table */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Prices</h4>
        <div className="border border-border rounded-lg overflow-hidden">
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
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDate(record.date)}
                  </td>
                  <td className="px-3 py-2">
                    {getVendorName(record.vendorId)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(record.normalizedPrice)}/{record.unit}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {record.packageType || '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {record.type === 'purchased' ? (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                        ✓ Purchased
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Quote
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <LogQuoteModal
        isOpen={showLogQuote}
        onClose={() => setShowLogQuote(false)}
        onSave={onAddPriceRecord}
        products={[product]}
        vendors={vendors}
        currentSeasonYear={currentSeasonYear}
        preselectedProductId={product.id}
      />
    </div>
  );
};
