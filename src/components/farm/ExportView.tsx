import React, { useState } from 'react';
import { Download, FileSpreadsheet, Building2, Leaf } from 'lucide-react';
import type { Season, Product, Vendor, InventoryItem, LiquidUnit, DryUnit } from '@/types/farm';
import { convertToGallons, convertToPounds, downloadCSV } from '@/utils/farmUtils';

interface ExportViewProps {
  season: Season | null;
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
}

export const ExportView: React.FC<ExportViewProps> = ({ season, products, vendors, inventory }) => {
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');

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
    
    let csv = 'Product,Total Need,Unit,On Hand,Order Qty,Price,Total Cost\n';
    
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
      
      csv += `"${product.name}",${need.totalNeed.toFixed(2)},${need.unit},${onHand},${orderQty.toFixed(2)},${product.price}/${product.priceUnit},${cost.toFixed(2)}\n`;
    });
    
    downloadCSV(csv, `${season.year}_${vendor.name}_Order.csv`);
  };

  const generateCropPlanCSV = (cropId: string) => {
    if (!season) return;
    const crop = season.crops.find(c => c.id === cropId);
    if (!crop) return;

    let csv = 'Application Timing,Product,Rate,Unit,Tier,Acres,Cost/Acre,Total Cost\n';
    
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
        
        csv += `"${timing.name}","${product.name}",${app.rate},${app.rateUnit},"${tier.name}",${tierAcres},${costPerAcre.toFixed(2)},${(costPerAcre * tierAcres).toFixed(2)}\n`;
      });
    });
    
    downloadCSV(csv, `${season.year}_${crop.name}_Plan.csv`);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground">Export</h2>
        <p className="text-muted-foreground mt-1">Download reports and order sheets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Full Farm Plan */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Full Farm Plan</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Export complete plan with all crops, timings, products, and costs.
          </p>
          <button
            onClick={generateFarmPlanCSV}
            disabled={!season}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
        </div>

        {/* Crop Plan Sheet */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
            <Leaf className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Crop Plan Sheet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Export a single crop's application plan.
          </p>
          <select
            className="w-full px-3 py-2 mb-3 border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={!season?.crops.length}
            defaultValue=""
            onChange={(e) => e.target.value && generateCropPlanCSV(e.target.value)}
          >
            <option value="" disabled>Select a crop...</option>
            {season?.crops.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Vendor Order Sheet */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Vendor Order Sheet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Export order quantities for a specific vendor.
          </p>
          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
            className="w-full px-3 py-2 mb-3 border border-input rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a vendor...</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <button
            onClick={() => selectedVendorId && generateVendorOrderCSV(selectedVendorId)}
            disabled={!season || !selectedVendorId}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Download Order CSV
          </button>
        </div>
      </div>
    </div>
  );
};
