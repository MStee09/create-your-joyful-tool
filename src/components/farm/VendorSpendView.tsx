import React, { useMemo, useState } from 'react';
import { DollarSign, Building2, ChevronDown, ChevronRight, Download, AlertCircle, ShoppingCart, TrendingUp } from 'lucide-react';
import type { Season, Product, VendorOffering, Vendor } from '../../types';
import type { SimplePurchase } from '../../types/simplePurchase';
import { calculatePlannedUsage } from '../../lib/calculations';
import { 
  calculateVendorSpending, 
  formatSpendCurrency, 
  generateVendorSpendCSV,
} from '../../lib/vendorSpendingUtils';

interface VendorSpendViewProps {
  season: Season | null;
  products: Product[];
  vendorOfferings: VendorOffering[];
  vendors: Vendor[];
  purchases?: SimplePurchase[];
}

export const VendorSpendView: React.FC<VendorSpendViewProps> = ({
  season,
  products,
  vendorOfferings,
  vendors,
  purchases = [],
}) => {
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'spend' | 'name' | 'products'>('spend');
  
  const plannedUsage = useMemo(() => 
    calculatePlannedUsage(season, products), 
    [season, products]
  );
  
  const { vendorSpending, totals } = useMemo(() => 
    calculateVendorSpending(plannedUsage, products, vendorOfferings, vendors, purchases),
    [plannedUsage, products, vendorOfferings, vendors, purchases]
  );
  
  const sortedVendors = useMemo(() => {
    const sorted = [...vendorSpending];
    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => a.vendorName.localeCompare(b.vendorName));
      case 'products':
        return sorted.sort((a, b) => b.productBreakdown.length - a.productBreakdown.length);
      default:
        return sorted.sort((a, b) => b.totalSpend - a.totalSpend);
    }
  }, [vendorSpending, sortBy]);
  
  const toggleVendor = (vendorId: string) => {
    setExpandedVendors(prev => {
      const next = new Set(prev);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  };
  
  const handleExportCSV = () => {
    const csv = generateVendorSpendCSV(vendorSpending, totals, season?.year || new Date().getFullYear());
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-spend-${season?.year || 'season'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const formatQty = (qty: number, unit: string): string => {
    if (['jug', 'bag', 'case', 'tote'].includes(unit)) {
      return `${qty.toFixed(1)} ${unit}${qty !== 1 ? 's' : ''}`;
    }
    if (unit === 'gal') return `${qty.toFixed(1)} gal`;
    if (unit === 'lbs') return `${Math.round(qty).toLocaleString()} lbs`;
    return `${qty.toFixed(2)} ${unit}`;
  };

  // Calculate totals by source
  const purchaseSpend = useMemo(() => {
    let total = 0;
    vendorSpending.forEach(v => {
      v.productBreakdown.forEach(p => {
        if (p.source === 'purchase') total += p.extendedCost;
      });
    });
    return total;
  }, [vendorSpending]);

  const projectedSpend = totals.totalSeasonSpend - purchaseSpend;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Vendor Spend</h2>
          <p className="text-muted-foreground mt-1">
            Spending by vendor for {season?.year || 'current'} season
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-muted-foreground">Total Season Spend</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatSpendCurrency(totals.totalSeasonSpend)}
          </p>
        </div>
        
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-muted-foreground">Booked / Purchased</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatSpendCurrency(purchaseSpend)}</p>
          {totals.totalSeasonSpend > 0 && (
            <p className="text-xs text-muted-foreground">
              {((purchaseSpend / totals.totalSeasonSpend) * 100).toFixed(0)}% of total
            </p>
          )}
        </div>
        
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-muted-foreground">Projected Remaining</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatSpendCurrency(projectedSpend)}</p>
        </div>
        
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-stone-600" />
            </div>
            <span className="text-sm text-muted-foreground">Vendors</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totals.vendorCount}</p>
        </div>
      </div>
      
      {/* Sort Controls */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'spend' | 'name' | 'products')}
          className="px-3 py-1 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="spend">Highest Spend</option>
          <option value="name">Vendor Name (A-Z)</option>
          <option value="products">Most Products</option>
        </select>
      </div>
      
      {/* Vendor List */}
      <div className="space-y-3">
        {sortedVendors.map(vendor => {
          const isExpanded = expandedVendors.has(vendor.vendorId);
          
          return (
            <div key={vendor.vendorId} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <button
                onClick={() => toggleVendor(vendor.vendorId)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">{vendor.vendorName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {vendor.productBreakdown.length} product{vendor.productBreakdown.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">
                    {formatSpendCurrency(vendor.totalSpend)}
                  </p>
                  {totals.totalSeasonSpend > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {((vendor.totalSpend / totals.totalSeasonSpend) * 100).toFixed(1)}% of total
                    </p>
                  )}
                </div>
              </button>
              
              {isExpanded && (
                <div className="border-t border-border">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="text-left px-6 py-2">Product</th>
                        <th className="text-left px-6 py-2">Source</th>
                        <th className="text-right px-6 py-2">Quantity</th>
                        <th className="text-right px-6 py-2">Price</th>
                        <th className="text-right px-6 py-2">Extended</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendor.productBreakdown.map((product, idx) => (
                        <tr key={`${product.productId}-${idx}`} className="border-t border-border/50">
                          <td className="px-6 py-3 text-foreground">{product.productName}</td>
                          <td className="px-6 py-3">
                            {product.source === 'purchase' ? (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                <ShoppingCart className="w-3 h-3" /> Booked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                <TrendingUp className="w-3 h-3" /> Projected
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right text-muted-foreground">
                            {formatQty(product.quantityNeeded, product.unit)}
                          </td>
                          <td className="px-6 py-3 text-right text-muted-foreground">
                            ${product.pricePerUnit.toFixed(2)}/{product.priceUnit}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-foreground">
                            {formatSpendCurrency(product.extendedCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Unassigned Products */}
        {totals.unassignedProducts.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
            <div className="p-4 flex items-center gap-4">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-semibold text-foreground">Products Without Vendor</h3>
                <p className="text-sm text-muted-foreground">
                  {totals.unassignedProducts.length} product{totals.unassignedProducts.length !== 1 ? 's' : ''} • 
                  Estimated: {formatSpendCurrency(totals.unassignedSpend)}
                </p>
              </div>
            </div>
            <div className="border-t border-amber-200 bg-white/50">
              <table className="w-full">
                <tbody>
                  {totals.unassignedProducts.map(product => (
                    <tr key={product.productId} className="border-t border-amber-100 first:border-t-0">
                      <td className="px-6 py-3 text-foreground">{product.productName}</td>
                      <td className="px-6 py-3 text-right text-muted-foreground">
                        {formatQty(product.quantityNeeded, product.unit)}
                      </td>
                      <td className="px-6 py-3 text-right text-muted-foreground text-sm">
                        (est. ${product.pricePerUnit.toFixed(2)}/{product.priceUnit})
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-amber-600">
                        {formatSpendCurrency(product.extendedCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Empty State */}
      {plannedUsage.length === 0 && purchases.length === 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
          <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">No Planned Usage</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Add applications to your crop plans to see projected vendor spending.
          </p>
        </div>
      )}
    </div>
  );
};
