import React, { useMemo } from 'react';
import { Leaf, DollarSign, BarChart3, Package } from 'lucide-react';
import type { Season, Product } from '@/types/farm';
import type { ProductPurpose } from '@/types/productIntelligence';
import { formatCurrency, formatNumber, convertToGallons, convertToPounds } from '@/utils/farmUtils';
import type { LiquidUnit, DryUnit } from '@/types/farm';
import { RolesNeededQueue } from './RolesNeededQueue';

interface DashboardViewProps {
  season: Season | null;
  products: Product[];
  purposes?: Record<string, ProductPurpose>;
  onNavigateToProduct?: (productId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  season, 
  products, 
  purposes = {},
  onNavigateToProduct,
}) => {
  const stats = useMemo(() => {
    if (!season) return { totalAcres: 0, totalCost: 0, costPerAcre: 0, cropCount: 0 };
    
    let totalCost = 0;
    let totalAcres = 0;
    
    season.crops.forEach(crop => {
      totalAcres += crop.totalAcres;
      
      crop.applications.forEach(app => {
        const product = products.find(p => p.id === app.productId);
        const tier = crop.tiers.find(t => t.id === app.tierId);
        if (!product || !tier) return;
        
        const tierAcres = crop.totalAcres * (tier.percentage / 100);
        let costPerAcre = 0;
        
        if (product.form === 'liquid') {
          const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
          costPerAcre = gallonsPerAcre * product.price;
        } else {
          const poundsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
          const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
          costPerAcre = poundsPerAcre * pricePerPound;
        }
        
        totalCost += costPerAcre * tierAcres;
      });
    });
    
    return {
      totalAcres,
      totalCost,
      costPerAcre: totalAcres > 0 ? totalCost / totalAcres : 0,
      cropCount: season.crops.length,
    };
  }, [season, products]);

  const cropSummaries = useMemo(() => {
    if (!season) return [];
    
    return season.crops.map(crop => {
      let cropCost = 0;
      
      crop.applications.forEach(app => {
        const product = products.find(p => p.id === app.productId);
        const tier = crop.tiers.find(t => t.id === app.tierId);
        if (!product || !tier) return;
        
        const tierAcres = crop.totalAcres * (tier.percentage / 100);
        let costPerAcre = 0;
        
        if (product.form === 'liquid') {
          const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
          costPerAcre = gallonsPerAcre * product.price;
        } else {
          const poundsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
          const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
          costPerAcre = poundsPerAcre * pricePerPound;
        }
        
        cropCost += costPerAcre * tierAcres;
      });
      
      return {
        name: crop.name,
        acres: crop.totalAcres,
        totalCost: cropCost,
        costPerAcre: crop.totalAcres > 0 ? cropCost / crop.totalAcres : 0,
        applicationCount: crop.applications.length,
      };
    });
  }, [season, products]);

  // Get products used in the current season's plan
  const productsInPlan = useMemo(() => {
    if (!season) return [];
    const productIds = new Set<string>();
    season.crops.forEach(crop => {
      crop.applications.forEach(app => {
        productIds.add(app.productId);
      });
    });
    return products.filter(p => productIds.has(p.id));
  }, [season, products]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          {season ? `${season.year} - ${season.name}` : 'No season selected'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Leaf className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Acres</p>
              <p className="text-2xl font-bold text-foreground">{formatNumber(stats.totalAcres, 0)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Plan Cost</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalCost)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-amber" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Cost/Acre</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.costPerAcre)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Crops Planned</p>
              <p className="text-2xl font-bold text-foreground">{stats.cropCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout for queue and table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Roles Needed Queue */}
        <div className="lg:col-span-1">
          {productsInPlan.length > 0 && onNavigateToProduct && (
            <RolesNeededQueue
              products={productsInPlan}
              purposes={purposes}
              onSelectProduct={onNavigateToProduct}
              maxVisible={6}
            />
          )}
        </div>

        {/* Right column - Crop Summary Table */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-sm border border-border">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Crop Cost Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Crop</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acres</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Applications</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Cost</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cost/Acre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cropSummaries.map((crop, idx) => (
                  <tr key={idx} className="hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium text-foreground">{crop.name}</td>
                    <td className="px-6 py-4 text-right text-muted-foreground">{formatNumber(crop.acres, 0)}</td>
                    <td className="px-6 py-4 text-right text-muted-foreground">{crop.applicationCount}</td>
                    <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(crop.totalCost)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-primary">{formatCurrency(crop.costPerAcre)}</td>
                  </tr>
                ))}
                {cropSummaries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      No crops configured. Add crops in the Crop Plans section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

