import React, { useState, forwardRef, useMemo } from 'react';
import { Download, FileSpreadsheet, Building2, Leaf, ShoppingCart } from 'lucide-react';
import type { Season, Product, Vendor, InventoryItem, LiquidUnit, DryUnit } from '../types';
import { convertToGallons, convertToPounds, downloadCSV, formatCurrency, calculateCropCosts } from '../lib/calculations';

interface EnhancedExportViewProps {
  season: Season | null;
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
}

export const EnhancedExportView = forwardRef<HTMLDivElement, EnhancedExportViewProps>(({
  season,
  products,
  vendors,
  inventory,
}, ref) => {
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');

  // Calculate all product needs across the season
  const allProductNeeds = useMemo(() => {
    if (!season) return {};
    
    const needs: Record<string, { totalNeed: number; unit: string }> = {};
    
    season.crops.forEach(crop => {
      crop.applications.forEach(app => {
        const product = products.find(p => p.id === app.productId);
        const tier = crop.tiers.find(t => t.id === app.tierId);
        if (!product || !tier) return;
        
        const tierAcres = crop.totalAcres * (tier.percentage / 100);
        
        if (product.form === 'liquid') {
          const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
          if (!needs[app.productId]) {
            needs[app.productId] = { totalNeed: 0, unit: 'gal' };
          }
          needs[app.productId].totalNeed += gallonsPerAcre * tierAcres;
        } else {
          const poundsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
          if (!needs[app.productId]) {
            needs[app.productId] = { totalNeed: 0, unit: 'lbs' };
          }
          needs[app.productId].totalNeed += poundsPerAcre * tierAcres;
        }
      });
      
      // Include seed treatments
      crop.seedTreatments.forEach(st => {
        const product = products.find(p => p.id === st.productId);
        if (!product) return;
        
        const cwtPerAcre = st.plantingRateLbsPerAcre / 100;
        let productPerAcre = 0;
        
        if (st.rateUnit === 'oz') {
          productPerAcre = (st.ratePerCwt * cwtPerAcre) / 128;
        } else {
          productPerAcre = (st.ratePerCwt * cwtPerAcre) / 453.592 / 128;
        }
        
        if (!needs[st.productId]) {
          needs[st.productId] = { totalNeed: 0, unit: 'gal' };
        }
        needs[st.productId].totalNeed += productPerAcre * crop.totalAcres;
      });
    });
    
    return needs;
  }, [season, products]);

  const generateFarmPlanCSV = () => {
    if (!season) return;
    
    let csv = 'Crop,Application Timing,Product,Rate,Unit,Tier,Acres,Cost/Acre,Total Cost\n';
    
    season.crops.forEach(crop => {
      crop.applicationTimings.forEach(timing => {
        const apps = crop.applications.filter(a => a.timingId === timing.id);
        apps.forEach(app => {
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
          
          csv += `"${crop.name}","${timing.name}","${product.name}",${app.rate},${app.rateUnit},"${tier.name}",${tierAcres},${costPerAcre.toFixed(2)},${(costPerAcre * tierAcres).toFixed(2)}\n`;
        });
      });
    });
    
    downloadCSV(csv, `${season.year}_${season.name}_Farm_Plan.csv`);
  };

  const generateVendorOrderCSV = (vendorId: string) => {
    if (!season) return;
    
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return;
    
    const vendorProducts = products.filter(p => p.vendorId === vendorId);
    const productNeeds: Record<string, { totalNeed: number; unit: string }> = {};
    
    season.crops.forEach(crop => {
      crop.applications.forEach(app => {
        const product = vendorProducts.find(p => p.id === app.productId);
        const tier = crop.tiers.find(t => t.id === app.tierId);
        if (!product || !tier) return;
        
        const tierAcres = crop.totalAcres * (tier.percentage / 100);
        
        if (product.form === 'liquid') {
          const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
          if (!productNeeds[app.productId]) {
            productNeeds[app.productId] = { totalNeed: 0, unit: 'gal' };
          }
          productNeeds[app.productId].totalNeed += gallonsPerAcre * tierAcres;
        } else {
          const poundsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
          if (!productNeeds[app.productId]) {
            productNeeds[app.productId] = { totalNeed: 0, unit: 'lbs' };
          }
          productNeeds[app.productId].totalNeed += poundsPerAcre * tierAcres;
        }
      });
    });
    
    let csv = 'Product,Total Need,Unit,On Hand,To Order,Price,Est. Cost\n';
    
    Object.entries(productNeeds).forEach(([productId, need]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      const inv = inventory.find(i => i.productId === productId);
      const onHand = inv?.quantity || 0;
      const orderQty = Math.max(0, need.totalNeed - onHand);
      
      let cost = 0;
      if (product.form === 'liquid') {
        cost = orderQty * product.price;
      } else {
        const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
        cost = orderQty * pricePerPound;
      }
      
      csv += `"${product.name}",${need.totalNeed.toFixed(2)},${need.unit},${onHand.toFixed(2)},${orderQty.toFixed(2)},$${product.price}/${product.priceUnit},$${cost.toFixed(2)}\n`;
    });
    
    downloadCSV(csv, `${season.year}_${vendor.name}_Order.csv`);
  };

  const generateMasterPurchaseListCSV = () => {
    if (!season) return;
    
    let csv = 'Vendor,Product,Total Need,Unit,On Hand,To Order,Price,Est. Cost\n';
    let totalOrderCost = 0;
    
    // Group by vendor
    const vendorOrders: Record<string, Array<{
      product: Product;
      need: number;
      unit: string;
      onHand: number;
      toOrder: number;
      cost: number;
    }>> = {};
    
    Object.entries(allProductNeeds).forEach(([productId, need]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      const vendor = vendors.find(v => v.id === product.vendorId);
      const vendorName = vendor?.name || 'Unknown';
      
      const inv = inventory.find(i => i.productId === productId);
      const onHand = inv?.quantity || 0;
      const toOrder = Math.max(0, need.totalNeed - onHand);
      
      let cost = 0;
      if (product.form === 'liquid') {
        cost = toOrder * product.price;
      } else {
        const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
        cost = toOrder * pricePerPound;
      }
      
      if (!vendorOrders[vendorName]) {
        vendorOrders[vendorName] = [];
      }
      
      vendorOrders[vendorName].push({
        product,
        need: need.totalNeed,
        unit: need.unit,
        onHand,
        toOrder,
        cost,
      });
      
      totalOrderCost += cost;
    });
    
    // Sort vendors alphabetically and output
    Object.keys(vendorOrders).sort().forEach(vendorName => {
      vendorOrders[vendorName].forEach(item => {
        csv += `"${vendorName}","${item.product.name}",${item.need.toFixed(2)},${item.unit},${item.onHand.toFixed(2)},${item.toOrder.toFixed(2)},$${item.product.price}/${item.product.priceUnit},$${item.cost.toFixed(2)}\n`;
      });
    });
    
    csv += `\n"","TOTAL","","","","",$${totalOrderCost.toFixed(2)}\n`;
    
    downloadCSV(csv, `${season.year}_Master_Purchase_List.csv`);
  };

  const generateCropSummaryCSV = () => {
    if (!season) return;
    
    let csv = 'Crop,Total Acres,Applications,Seed Treatments,Total Cost,Cost Per Acre\n';
    
    season.crops.forEach(crop => {
      const costs = calculateCropCosts(crop, products);
      csv += `"${crop.name}",${crop.totalAcres},${crop.applicationTimings.length},${crop.seedTreatments.length},${costs.totalCost.toFixed(2)},${costs.costPerAcre.toFixed(2)}\n`;
    });
    
    downloadCSV(csv, `${season.year}_Crop_Summary.csv`);
  };

  // Calculate total order value
  const totalOrderValue = useMemo(() => {
    let total = 0;
    Object.entries(allProductNeeds).forEach(([productId, need]) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      const inv = inventory.find(i => i.productId === productId);
      const onHand = inv?.quantity || 0;
      const toOrder = Math.max(0, need.totalNeed - onHand);
      
      if (product.form === 'liquid') {
        total += toOrder * product.price;
      } else {
        const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
        total += toOrder * pricePerPound;
      }
    });
    return total;
  }, [allProductNeeds, products, inventory]);

  const productsToOrder = useMemo(() => {
    return Object.entries(allProductNeeds).filter(([productId, need]) => {
      const inv = inventory.find(i => i.productId === productId);
      const onHand = inv?.quantity || 0;
      return need.totalNeed > onHand;
    }).length;
  }, [allProductNeeds, inventory]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-stone-800">Export</h2>
        <p className="text-stone-500 mt-1">Download reports and order sheets</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Master Purchase List - NEW PRIMARY EXPORT */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-emerald-200 p-6 col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 mb-1">Master Purchase List</h3>
                <p className="text-sm text-stone-500 mb-3">
                  All products needed across all vendors, minus what's on hand. Your true buying list.
                </p>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-stone-500">Products to order: </span>
                    <span className="font-semibold text-stone-800">{productsToOrder}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">Est. total: </span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(totalOrderValue)}</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={generateMasterPurchaseListCSV}
              disabled={!season}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Full Farm Plan */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-6 h-6 text-stone-600" />
          </div>
          <h3 className="font-semibold text-stone-800 mb-2">Full Farm Plan</h3>
          <p className="text-sm text-stone-500 mb-4">
            Complete plan with all crops, timings, products, and costs.
          </p>
          <button
            onClick={generateFarmPlanCSV}
            disabled={!season}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-stone-600 text-white rounded-lg font-medium hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>

        {/* Crop Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center mb-4">
            <Leaf className="w-6 h-6 text-stone-600" />
          </div>
          <h3 className="font-semibold text-stone-800 mb-2">Crop Summary</h3>
          <p className="text-sm text-stone-500 mb-4">
            Overview of all crops with total costs and per-acre breakdowns.
          </p>
          <button
            onClick={generateCropSummaryCSV}
            disabled={!season}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-stone-600 text-white rounded-lg font-medium hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>

        {/* Vendor Order Sheet */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-stone-600" />
          </div>
          <h3 className="font-semibold text-stone-800 mb-2">Single Vendor Order</h3>
          <p className="text-sm text-stone-500 mb-4">
            Product needs for one vendor, with inventory deducted.
          </p>
          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
            className="w-full px-3 py-2 mb-3 border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select a vendor...</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <button
            onClick={() => selectedVendorId && generateVendorOrderCSV(selectedVendorId)}
            disabled={!season || !selectedVendorId}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-stone-600 text-white rounded-lg font-medium hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download Order CSV
          </button>
        </div>
      </div>

      {/* Season Stats */}
      {season && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <h3 className="font-semibold text-stone-800 mb-4">Season Overview</h3>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-stone-500">Total Crops</p>
              <p className="text-2xl font-bold text-stone-800">{season.crops.length}</p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Total Acres</p>
              <p className="text-2xl font-bold text-stone-800">
                {season.crops.reduce((sum, c) => sum + c.totalAcres, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Total Applications</p>
              <p className="text-2xl font-bold text-stone-800">
                {season.crops.reduce((sum, c) => sum + c.applicationTimings.length, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-stone-500">Total Cost</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(
                  season.crops.reduce((sum, c) => sum + calculateCropCosts(c, products).totalCost, 0)
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

EnhancedExportView.displayName = 'EnhancedExportView';
