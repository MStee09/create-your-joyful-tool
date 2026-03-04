import React, { useState, useMemo, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, Search, Pencil, Check, X, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/calculations';
import type { Vendor, ProductMaster, VendorOffering } from '@/types';
import type { PriceRecord, NewPriceRecord } from '@/types/priceRecord';
import { LogQuoteModal } from './LogQuoteModal';

interface PriceHistoryViewProps {
  priceRecords: PriceRecord[];
  products: ProductMaster[];
  vendors: Vendor[];
  vendorOfferings: VendorOffering[];
  currentSeasonYear: number;
  onAddPriceRecord: (record: NewPriceRecord) => Promise<any>;
  onUpdateOfferings: (offerings: VendorOffering[]) => void;
}

export const PriceHistoryView: React.FC<PriceHistoryViewProps> = ({
  priceRecords,
  products,
  vendors,
  vendorOfferings,
  currentSeasonYear,
  onAddPriceRecord,
  onUpdateOfferings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showUpdatePriceModal, setShowUpdatePriceModal] = useState(false);
  const [editingOfferingId, setEditingOfferingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [trendView, setTrendView] = useState<'monthly' | 'yearly'>('monthly');
  const [trendRange, setTrendRange] = useState<string>('12'); // months or years
  const [selectedChartProduct, setSelectedChartProduct] = useState<string>('all');

  const VENDOR_COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--destructive))',
    'hsl(142, 76%, 36%)',
    'hsl(280, 67%, 50%)',
    'hsl(32, 95%, 50%)',
    'hsl(190, 90%, 40%)',
    'hsl(340, 75%, 55%)',
    'hsl(60, 80%, 40%)',
  ];

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats);
  }, [products]);

  // Build quick-edit table from vendor offerings
  const offeringRows = useMemo(() => {
    return vendorOfferings
      .map(offering => {
        const product = products.find(p => p.id === offering.productId);
        const vendor = vendors.find(v => v.id === offering.vendorId);
        if (!product || !vendor) return null;
        return { offering, product, vendor };
      })
      .filter(Boolean)
      .filter(row => {
        if (!row) return false;
        if (searchQuery && !row.product.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (vendorFilter !== 'all' && row.vendor.id !== vendorFilter) return false;
        if (categoryFilter !== 'all' && row.product.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => a!.product.name.localeCompare(b!.product.name)) as {
        offering: VendorOffering;
        product: ProductMaster;
        vendor: Vendor;
      }[];
  }, [vendorOfferings, products, vendors, searchQuery, vendorFilter, categoryFilter]);

  // Build trend data from price_records
  const trendData = useMemo(() => {
    // Get all products that have price records
    const productIds = [...new Set(priceRecords.map(r => r.productId))];
    
    // Generate time columns
    const columns: { key: string; label: string }[] = [];
    const now = new Date();
    
    if (trendView === 'monthly') {
      const monthCount = parseInt(trendRange);
      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        columns.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        });
      }
    } else {
      const yearCount = parseInt(trendRange);
      for (let i = yearCount; i >= 0; i--) {
        const y = currentSeasonYear - i;
        columns.push({ key: String(y), label: String(y) });
      }
    }

    const rows = productIds
      .map(productId => {
        const product = products.find(p => p.id === productId);
        if (!product) return null;
        if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) return null;
        if (categoryFilter !== 'all' && product.category !== categoryFilter) return null;

        const records = priceRecords.filter(r => r.productId === productId);
        
        // Apply vendor filter to records
        const filteredRecords = vendorFilter !== 'all' 
          ? records.filter(r => r.vendorId === vendorFilter)
          : records;

        const prices: Record<string, number | null> = {};
        
        columns.forEach(col => {
          if (trendView === 'monthly') {
            const [year, month] = col.key.split('-').map(Number);
            const monthRecords = filteredRecords.filter(r => {
              const d = new Date(r.date);
              return d.getFullYear() === year && d.getMonth() + 1 === month;
            });
            // Take most recent in that month
            if (monthRecords.length > 0) {
              const sorted = monthRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              prices[col.key] = sorted[0].normalizedPrice;
            } else {
              prices[col.key] = null;
            }
          } else {
            const year = parseInt(col.key);
            const yearRecords = filteredRecords.filter(r => r.seasonYear === year);
            if (yearRecords.length > 0) {
              const sorted = yearRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              prices[col.key] = sorted[0].normalizedPrice;
            } else {
              prices[col.key] = null;
            }
          }
        });

        // Calculate change between first and last available
        const firstCol = columns.find(c => prices[c.key] !== null);
        const lastCol = [...columns].reverse().find(c => prices[c.key] !== null);
        let change: { amount: number; percent: number } | null = null;
        if (firstCol && lastCol && firstCol.key !== lastCol.key) {
          const startPrice = prices[firstCol.key]!;
          const endPrice = prices[lastCol.key]!;
          const amount = endPrice - startPrice;
          const percent = (amount / startPrice) * 100;
          change = { amount, percent };
        }

        return { productId, product, prices, change };
      })
      .filter(Boolean) as {
        productId: string;
        product: ProductMaster;
        prices: Record<string, number | null>;
        change: { amount: number; percent: number } | null;
      }[];

    return { columns, rows };
  }, [priceRecords, products, currentSeasonYear, searchQuery, categoryFilter, vendorFilter, trendView, trendRange]);

  // Insights: biggest movers
  const insights = useMemo(() => {
    const withChanges = trendData.rows.filter(r => r.change);
    const sorted = [...withChanges].sort((a, b) => (b.change?.percent || 0) - (a.change?.percent || 0));
    return {
      increases: sorted.filter(r => (r.change?.percent || 0) > 0).slice(0, 3),
      decreases: sorted.filter(r => (r.change?.percent || 0) < 0).slice(0, 3),
    };
  }, [trendData]);

  // Chart data: plot every price record as a data point, one line per vendor
  const chartData = useMemo(() => {
    const filtered = selectedChartProduct === 'all'
      ? priceRecords
      : priceRecords.filter(r => r.productId === selectedChartProduct);

    if (filtered.length === 0) return { points: [], vendorLines: [] };

    // Get unique vendors in filtered records
    const vendorIds = [...new Set(filtered.map(r => r.vendorId))];
    const vendorLines = vendorIds.map((vid, i) => ({
      vendorId: vid,
      vendorName: vendors.find(v => v.id === vid)?.name || 'Unknown',
      color: VENDOR_COLORS[i % VENDOR_COLORS.length],
    }));

    // Sort all records by date
    const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Build data points grouped by date
    const dateMap = new Map<string, Record<string, any>>();
    sorted.forEach(r => {
      const dateKey = r.date;
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: dateKey, dateLabel: new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) });
      }
      const entry = dateMap.get(dateKey)!;
      // If multiple records same vendor same date, take latest (highest normalizedPrice key wins)
      entry[r.vendorId] = r.normalizedPrice;
      entry[`${r.vendorId}_type`] = r.type;
    });

    return { points: Array.from(dateMap.values()), vendorLines };
  }, [priceRecords, selectedChartProduct, vendors, VENDOR_COLORS]);

  // Vendor comparison: latest price per vendor for selected product
  const vendorComparison = useMemo(() => {
    if (selectedChartProduct === 'all') return null;
    const filtered = priceRecords.filter(r => r.productId === selectedChartProduct);
    const vendorIds = [...new Set(filtered.map(r => r.vendorId))];
    const latest = vendorIds.map(vid => {
      const records = filtered.filter(r => r.vendorId === vid).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const vendor = vendors.find(v => v.id === vid);
      const product = products.find(p => p.id === selectedChartProduct);
      return records.length > 0 ? {
        vendorId: vid,
        vendorName: vendor?.name || 'Unknown',
        price: records[0].normalizedPrice,
        unit: records[0].unit,
        date: records[0].date,
        productUnit: product?.form === 'liquid' ? 'gal' : 'lbs',
      } : null;
    }).filter(Boolean).sort((a, b) => a!.price - b!.price) as { vendorId: string; vendorName: string; price: number; unit: string; date: string; productUnit: string }[];
    return latest;
  }, [priceRecords, selectedChartProduct, vendors, products]);

  // Inline edit handlers
  const startEdit = (offering: VendorOffering) => {
    setEditingOfferingId(offering.id);
    setEditPrice(offering.price);
  };

  const saveEdit = useCallback(async (offering: VendorOffering) => {
    if (editPrice <= 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    const product = products.find(p => p.id === offering.productId);
    
    // Update the vendor offering
    const updated = vendorOfferings.map(o =>
      o.id === offering.id
        ? { ...o, price: editPrice, priceUnit: offering.priceUnit, lastQuotedDate: today, updatedAt: new Date().toISOString() }
        : o
    );
    onUpdateOfferings(updated);

    // Auto-log a price record
    const record: NewPriceRecord = {
      productId: offering.productId,
      vendorId: offering.vendorId,
      price: editPrice,
      unit: (offering.priceUnit || (product?.form === 'liquid' ? 'gal' : 'lbs')) as any,
      normalizedPrice: editPrice,
      date: today,
      seasonYear: currentSeasonYear,
      type: 'quote',
      notes: 'Updated via Pricing dashboard',
    };
    await onAddPriceRecord(record);

    setEditingOfferingId(null);
  }, [editPrice, vendorOfferings, products, currentSeasonYear, onUpdateOfferings, onAddPriceRecord]);

  const cancelEdit = () => {
    setEditingOfferingId(null);
  };

  const formatUnit = (unit: string | null | undefined) => {
    switch (unit) {
      case 'gal': return '/gal';
      case 'lbs': return '/lb';
      case 'ton': return '/ton';
      default: return unit ? `/${unit}` : '/unit';
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Pricing</h2>
          <p className="text-muted-foreground mt-1">Update prices and track trends across all products</p>
        </div>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setShowUpdatePriceModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Update Price
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.filter(c => c && c.trim() !== '').map(cat => (
              <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Insights */}
      {(insights.increases.length > 0 || insights.decreases.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-destructive" />
                Biggest Increases
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.increases.map(r => (
                <div key={r.productId} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{r.product.name}</span>
                  <span className="text-sm font-medium text-destructive">
                    +{r.change?.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
              {insights.increases.length === 0 && (
                <p className="text-sm text-muted-foreground">No increases found</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-primary" />
                Price Drops
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.decreases.map(r => (
                <div key={r.productId} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{r.product.name}</span>
                  <span className="text-sm font-medium text-primary">
                    {r.change?.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
              {insights.decreases.length === 0 && (
                <p className="text-sm text-muted-foreground">No decreases found</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Price Trend Chart */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Price Trends</CardTitle>
            <Select value={selectedChartProduct} onValueChange={setSelectedChartProduct}>
              <SelectTrigger className="w-56 h-8">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products (avg)</SelectItem>
                {products
                  .filter(p => priceRecords.some(r => r.productId === p.id))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.points.length > 0 ? (
            <>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.points} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `$${v}`}
                      className="text-muted-foreground"
                    />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => {
                        const vendor = chartData.vendorLines.find(v => v.vendorId === name);
                        return [`$${value.toFixed(2)}`, vendor?.vendorName || name];
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
                    />
                    <Legend
                      formatter={(value) => {
                        const vendor = chartData.vendorLines.find(v => v.vendorId === value);
                        return vendor?.vendorName || value;
                      }}
                    />
                    {chartData.vendorLines.map(vl => (
                      <Line
                        key={vl.vendorId}
                        type="monotone"
                        dataKey={vl.vendorId}
                        stroke={vl.color}
                        strokeWidth={2}
                        dot={{ r: 4, fill: vl.color }}
                        activeDot={{ r: 6 }}
                        connectNulls
                        name={vl.vendorId}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Vendor Comparison Callout */}
              {vendorComparison && vendorComparison.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {vendorComparison.map((vc, i) => (
                    <div
                      key={vc.vendorId}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                        i === 0
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-muted/50 border border-border'
                      }`}
                    >
                      {i === 0 && <Award className="w-4 h-4 text-primary" />}
                      <span className={i === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                        {vc.vendorName}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(vc.price)}/{vc.unit}
                      </span>
                      {i > 0 && vendorComparison[0] && (
                        <span className="text-xs text-destructive">
                          +{formatCurrency(vc.price - vendorComparison[0].price)} more
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No price records found. Update prices to start tracking trends.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Price Update Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Current Vendor Prices</CardTitle>
          <p className="text-sm text-muted-foreground">Click edit to update a price — it will also log to price history automatically</p>
        </CardHeader>
        <CardContent>
          {offeringRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Product</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Vendor</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Price</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Updated</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {offeringRows.map(({ offering, product, vendor }) => (
                    <tr key={offering.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{product.name}</span>
                          {product.category && (
                            <Badge variant="outline" className="text-xs">{product.category}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">{vendor.name}</td>
                      <td className="text-right py-3 px-2">
                        {editingOfferingId === offering.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editPrice || ''}
                              onChange={e => setEditPrice(Number(e.target.value) || 0)}
                              className="w-24 h-8 text-right"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveEdit(offering);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <span className="text-xs text-muted-foreground">{formatUnit(offering.priceUnit)}</span>
                          </div>
                        ) : (
                          <span className="font-medium text-foreground">
                            {formatCurrency(offering.price)}{formatUnit(offering.priceUnit)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground text-sm">
                        {formatDate(offering.lastQuotedDate)}
                      </td>
                      <td className="text-center py-3 px-2">
                        {editingOfferingId === offering.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(offering)}>
                              <Check className="w-4 h-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                              <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(offering)}>
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No vendor offerings found. Add products and vendors first.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Trends */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Price Trends</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={trendView} onValueChange={v => {
                setTrendView(v as 'monthly' | 'yearly');
                setTrendRange(v === 'monthly' ? '12' : '3');
              }}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <Select value={trendRange} onValueChange={setTrendRange}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trendView === 'monthly' ? (
                    <>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                      <SelectItem value="24">24 Months</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="2">2 Years</SelectItem>
                      <SelectItem value="3">3 Years</SelectItem>
                      <SelectItem value="5">5 Years</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trendData.rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground sticky left-0 bg-card z-10">Product</th>
                    {trendData.columns.map(col => (
                      <th key={col.key} className="text-right py-3 px-2 font-medium text-muted-foreground whitespace-nowrap min-w-[70px]">
                        {col.label}
                      </th>
                    ))}
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {trendData.rows.map(row => (
                    <tr key={row.productId} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-2 sticky left-0 bg-card z-10">
                        <span className="font-medium text-foreground">{row.product.name}</span>
                      </td>
                      {trendData.columns.map((col, colIdx) => {
                        const val = row.prices[col.key];
                        const prevCol = colIdx > 0 ? trendData.columns[colIdx - 1] : null;
                        const prevVal = prevCol ? row.prices[prevCol.key] : null;
                        let changeClass = 'text-muted-foreground';
                        if (val !== null && prevVal !== null) {
                          if (val > prevVal) changeClass = 'text-destructive';
                          else if (val < prevVal) changeClass = 'text-primary';
                          else changeClass = 'text-foreground';
                        } else if (val !== null) {
                          changeClass = 'text-foreground';
                        }
                        return (
                          <td key={col.key} className={`text-right py-3 px-2 ${changeClass}`}>
                            {val !== null ? `$${val.toFixed(2)}` : '—'}
                          </td>
                        );
                      })}
                      <td className="text-right py-3 px-2">
                        {row.change ? (
                          <span className={`font-medium ${row.change.percent > 0 ? 'text-destructive' : 'text-primary'}`}>
                            {row.change.percent > 0 ? '▲' : '▼'} {row.change.percent > 0 ? '+' : ''}{row.change.percent.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No price history found. Update prices above to start tracking trends.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Price Modal */}
      <LogQuoteModal
        isOpen={showUpdatePriceModal}
        onClose={() => setShowUpdatePriceModal(false)}
        onSave={onAddPriceRecord}
        products={products}
        vendors={vendors}
        currentSeasonYear={currentSeasonYear}
        vendorOfferings={vendorOfferings}
        onUpdateOfferings={onUpdateOfferings}
      />
    </div>
  );
};
