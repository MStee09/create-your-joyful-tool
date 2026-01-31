import React, { useState, useMemo } from 'react';
import { Plus, TrendingUp, TrendingDown, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/calculations';
import type { Vendor, ProductMaster } from '@/types';
import type { PriceRecord, NewPriceRecord } from '@/types/priceRecord';
import { LogQuoteModal } from './LogQuoteModal';

interface PriceHistoryViewProps {
  priceRecords: PriceRecord[];
  products: ProductMaster[];
  vendors: Vendor[];
  currentSeasonYear: number;
  onAddPriceRecord: (record: NewPriceRecord) => Promise<any>;
}

export const PriceHistoryView: React.FC<PriceHistoryViewProps> = ({
  priceRecords,
  products,
  vendors,
  currentSeasonYear,
  onAddPriceRecord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('3');
  const [showLogQuoteModal, setShowLogQuoteModal] = useState(false);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats);
  }, [products]);

  // Group price records by product and calculate trends
  const productPrices = useMemo(() => {
    const grouped = new Map<string, PriceRecord[]>();
    
    priceRecords.forEach(record => {
      const existing = grouped.get(record.productId) || [];
      grouped.set(record.productId, [...existing, record]);
    });

    return Array.from(grouped.entries()).map(([productId, records]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return null;

      // Sort by date descending
      const sorted = [...records].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Get prices by year
      const priceByYear = new Map<number, number>();
      sorted.forEach(r => {
        if (!priceByYear.has(r.seasonYear)) {
          priceByYear.set(r.seasonYear, r.normalizedPrice);
        }
      });

      // Calculate change
      const currentPrice = priceByYear.get(currentSeasonYear);
      const yearsBack = parseInt(timeRange);
      const pastPrice = priceByYear.get(currentSeasonYear - yearsBack);
      
      let change = null;
      if (currentPrice && pastPrice) {
        const amount = currentPrice - pastPrice;
        const percent = ((currentPrice - pastPrice) / pastPrice) * 100;
        change = { amount, percent };
      }

      return {
        productId,
        productName: product.name,
        category: product.category,
        records: sorted,
        currentPrice,
        priceByYear,
        change,
        isCommodity: product.isBidEligible || false,
      };
    }).filter(Boolean);
  }, [priceRecords, products, currentSeasonYear, timeRange]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return productPrices.filter(pp => {
      if (!pp) return false;
      
      // Search filter
      if (searchQuery && !pp.productName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (categoryFilter !== 'all' && pp.category !== categoryFilter) {
        return false;
      }
      
      return true;
    });
  }, [productPrices, searchQuery, categoryFilter]);

  // Get biggest increases and decreases
  const insights = useMemo(() => {
    const withChanges = filteredProducts
      .filter(pp => pp?.change)
      .sort((a, b) => (b?.change?.percent || 0) - (a?.change?.percent || 0));

    const increases = withChanges.filter(pp => (pp?.change?.percent || 0) > 0).slice(0, 3);
    const decreases = withChanges.filter(pp => (pp?.change?.percent || 0) < 0).slice(0, 3);

    return { increases, decreases };
  }, [filteredProducts]);

  const getVendorName = (vendorId: string) =>
    vendors.find(v => v.id === vendorId)?.name || 'Unknown';

  const formatUnit = (unit: string) => {
    switch (unit) {
      case 'gal': return '/gal';
      case 'lbs': return '/lb';
      case 'ton': return '/ton';
      default: return `/${unit}`;
    }
  };

  // Get years to display
  const years = useMemo(() => {
    const yearsBack = parseInt(timeRange);
    const result = [];
    for (let i = yearsBack; i >= 0; i--) {
      result.push(currentSeasonYear - i);
    }
    return result;
  }, [currentSeasonYear, timeRange]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">Price History</h2>
          <p className="text-stone-500 mt-1">Track price trends across all products</p>
        </div>
        <Button 
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setShowLogQuoteModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Log Quote
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.filter(cat => cat && cat.trim() !== '').map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 Year</SelectItem>
            <SelectItem value="3">3 Years</SelectItem>
            <SelectItem value="5">5 Years</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Insights */}
      {(insights.increases.length > 0 || insights.decreases.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-500" />
                Biggest Increases ({timeRange}yr)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.increases.map(pp => (
                <div key={pp?.productId} className="flex items-center justify-between">
                  <span className="text-sm text-stone-700">{pp?.productName}</span>
                  <span className="text-sm font-medium text-red-600">
                    +{pp?.change?.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
              {insights.increases.length === 0 && (
                <p className="text-sm text-stone-400">No increases found</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-500 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-500" />
                Price Drops
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.decreases.map(pp => (
                <div key={pp?.productId} className="flex items-center justify-between">
                  <span className="text-sm text-stone-700">{pp?.productName}</span>
                  <span className="text-sm font-medium text-emerald-600">
                    {pp?.change?.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
              {insights.decreases.length === 0 && (
                <p className="text-sm text-stone-400">No decreases found</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* All Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Products</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-3 px-2 font-medium text-stone-600">Product</th>
                    {years.map(year => (
                      <th key={year} className="text-right py-3 px-2 font-medium text-stone-600">
                        {year}
                      </th>
                    ))}
                    <th className="text-right py-3 px-2 font-medium text-stone-600">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(pp => (
                    <tr key={pp?.productId} className="border-b border-stone-100 hover:bg-stone-50 cursor-pointer">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-800">{pp?.productName}</span>
                          {pp?.isCommodity && (
                            <Badge variant="outline" className="text-xs">Commodity</Badge>
                          )}
                        </div>
                      </td>
                      {years.map(year => (
                        <td key={year} className="text-right py-3 px-2 text-stone-600">
                          {pp?.priceByYear.get(year) 
                            ? `$${pp.priceByYear.get(year)?.toFixed(2)}` 
                            : '—'}
                        </td>
                      ))}
                      <td className="text-right py-3 px-2">
                        {pp?.change ? (
                          <span className={pp.change.percent > 0 ? 'text-red-600' : 'text-emerald-600'}>
                            {pp.change.percent > 0 ? '+' : ''}{pp.change.percent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-stone-500">No price history found. Start recording purchases or quotes to see trends.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Quote Modal */}
      <LogQuoteModal
        isOpen={showLogQuoteModal}
        onClose={() => setShowLogQuoteModal(false)}
        onSave={onAddPriceRecord}
        products={products}
        vendors={vendors}
        currentSeasonYear={currentSeasonYear}
      />
    </div>
  );
};
