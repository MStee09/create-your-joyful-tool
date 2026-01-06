import React, { useMemo, useState } from 'react';
import { DollarSign, Building2, ChevronDown, ChevronRight, Download, AlertCircle } from 'lucide-react';
import type { Season, Product, VendorOffering, Vendor } from '../../types';
import { calculatePlannedUsage } from '../../lib/calculations';
import { 
  calculateVendorSpending, 
  formatSpendCurrency, 
  generateVendorSpendCSV,
  type VendorSpendSummary,
} from '../../lib/vendorSpendingUtils';

interface VendorSpendViewProps {
  season: Season | null;
  products: Product[];
  vendorOfferings: VendorOffering[];
  vendors: Vendor[];
}

export const VendorSpendView: React.FC<VendorSpendViewProps> = ({
  season,
  products,
  vendorOfferings,
  vendors,
}) => {
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'spend' | 'name' | 'products'>('spend');
  
  // Calculate planned usage from crop plans
  const plannedUsage = useMemo(() => 
    calculatePlannedUsage(season, products), 
    [season, products]
  );
  
  // Calculate vendor spending
  const { vendorSpending, totals } = useMemo(() => 
    calculateVendorSpending(plannedUsage, products, vendorOfferings, vendors),
    [plannedUsage, products, vendorOfferings, vendors]
  );
  
  // Sort vendors
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
      if (next.has(vendorId)) {
        next.delete(vendorId);
      } else {
        next.add(vendorId);
      }
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
    if (unit === 'gal') {
      return `${qty.toFixed(1)} gal`;
    }
    if (unit === 'lbs') {
      return `${Math.round(qty).toLocaleString()} lbs`;
    }
    return `${qty.toFixed(2)} ${unit}`;
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">Vendor Spend</h2>
          <p className="text-stone-500 mt-1">
            Projected spending by vendor for {season?.year || 'current'} season
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-stone-500">Total Season Spend</span>
          </div>
          <p className="text-2xl font-bold text-stone-800">
            {formatSpendCurrency(totals.totalSeasonSpend)}
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-stone-500">Vendors</span>
          </div>
          <p className="text-2xl font-bold text-stone-800">{totals.vendorCount}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-stone-500">Largest Vendor</span>
          </div>
          <p className="text-2xl font-bold text-stone-800">
            {formatSpendCurrency(totals.largestVendorSpend)}
          </p>
          <p className="text-xs text-stone-500 truncate">{totals.largestVendorName}</p>
        </div>
        
        {totals.unassignedSpend > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-sm text-stone-500">No Vendor</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">
              {formatSpendCurrency(totals.unassignedSpend)}
            </p>
            <p className="text-xs text-stone-500">{totals.unassignedProducts.length} products</p>
          </div>
        )}
      </div>
      
      {/* Sort Controls */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-stone-500">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'spend' | 'name' | 'products')}
          className="px-3 py-1 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            <div key={vendor.vendorId} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              {/* Vendor Header */}
              <button
                onClick={() => toggleVendor(vendor.vendorId)}
                className="w-full flex items-center justify-between p-4 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-stone-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-stone-400" />
                  )}
                  <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-stone-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-stone-800">{vendor.vendorName}</h3>
                    <p className="text-sm text-stone-500">
                      {vendor.productBreakdown.length} product{vendor.productBreakdown.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-stone-800">
                    {formatSpendCurrency(vendor.totalSpend)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {((vendor.totalSpend / totals.totalSeasonSpend) * 100).toFixed(1)}% of total
                  </p>
                </div>
              </button>
              
              {/* Product Breakdown */}
              {isExpanded && (
                <div className="border-t border-stone-100">
                  <table className="w-full">
                    <thead className="bg-stone-50">
                      <tr className="text-xs text-stone-500 uppercase tracking-wider">
                        <th className="text-left px-6 py-2">Product</th>
                        <th className="text-right px-6 py-2">Quantity</th>
                        <th className="text-right px-6 py-2">Price</th>
                        <th className="text-right px-6 py-2">Extended</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendor.productBreakdown.map(product => (
                        <tr key={product.productId} className="border-t border-stone-50">
                          <td className="px-6 py-3 text-stone-800">{product.productName}</td>
                          <td className="px-6 py-3 text-right text-stone-600">
                            {formatQty(product.quantityNeeded, product.unit)}
                          </td>
                          <td className="px-6 py-3 text-right text-stone-600">
                            ${product.pricePerUnit.toFixed(2)}/{product.priceUnit}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-stone-800">
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
                <h3 className="font-semibold text-stone-800">Products Without Vendor</h3>
                <p className="text-sm text-stone-500">
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
                      <td className="px-6 py-3 text-stone-800">{product.productName}</td>
                      <td className="px-6 py-3 text-right text-stone-600">
                        {formatQty(product.quantityNeeded, product.unit)}
                      </td>
                      <td className="px-6 py-3 text-right text-stone-500 text-sm">
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
      {plannedUsage.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center">
          <DollarSign className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="font-semibold text-stone-800 mb-2">No Planned Usage</h3>
          <p className="text-stone-500 max-w-md mx-auto">
            Add applications to your crop plans to see projected vendor spending.
          </p>
        </div>
      )}
    </div>
  );
};
