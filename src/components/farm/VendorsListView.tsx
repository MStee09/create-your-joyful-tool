import React, { useState, useMemo } from 'react';
import { Plus, Search, Star, Check } from 'lucide-react';
import type { Vendor, VendorTag, ProductMaster, VendorOffering, Season } from '@/types';
import { generateId, CATEGORY_LABELS } from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';

interface VendorsListViewProps {
  vendors: Vendor[];
  productMasters: ProductMaster[];
  vendorOfferings: VendorOffering[];
  currentSeason?: Season | null;
  onUpdateVendors: (vendors: Vendor[]) => void;
  onSelectVendor: (vendorId: string) => void;
}

const TAG_LABELS: Record<VendorTag, string> = {
  'primary-biological': 'Primary Biological',
  'primary-fertility': 'Primary Fertility',
  'primary-crop-protection': 'Primary Crop Protection',
  'specialty': 'Specialty',
  'local': 'Local',
  'national': 'National',
};

// Simplified category labels for vendor list
const SIMPLE_CATEGORY: Record<string, string> = {
  'biological': 'Biological',
  'micronutrient': 'Micronutrient',
  'herbicide': 'Crop Protection',
  'fungicide': 'Crop Protection',
  'seed-treatment': 'Seed Treatment',
  'adjuvant': 'Adjuvant',
  'fertilizer-liquid': 'Fertility',
  'fertilizer-dry': 'Fertility',
  'other': 'Other',
};

export const VendorsListView: React.FC<VendorsListViewProps> = ({
  vendors,
  productMasters,
  vendorOfferings,
  currentSeason,
  onUpdateVendors,
  onSelectVendor,
}) => {
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorWebsite, setNewVendorWebsite] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Get vendor stats with season usage context
  const vendorStats = useMemo(() => {
    // Build map of productId -> vendorId from offerings
    const productToVendor: Record<string, string> = {};
    vendorOfferings.forEach(o => {
      productToVendor[o.productId] = o.vendorId;
    });

    // Find which products are used in current season and which crops
    const usedProductIds = new Set<string>();
    const productToCrops: Record<string, string[]> = {};
    
    currentSeason?.crops.forEach(crop => {
      crop.applications.forEach(app => {
        // Find the productMaster for this application's productId
        const master = productMasters.find(p => p.id === app.productId);
        if (master) {
          usedProductIds.add(master.id);
          if (!productToCrops[master.id]) productToCrops[master.id] = [];
          if (!productToCrops[master.id].includes(crop.name)) {
            productToCrops[master.id].push(crop.name);
          }
        }
      });
    });

    const stats: Record<string, { 
      productCount: number; 
      preferredCount: number; 
      hasPreferred: boolean;
      categories: string[]; 
      primaryCategory: string;
      usedInCrops: string[];
      isKeyVendor: boolean;
    }> = {};
    
    vendors.forEach(vendor => {
      const offerings = vendorOfferings.filter(o => o.vendorId === vendor.id);
      const categories: string[] = [];
      const categoryCounts: Record<string, number> = {};
      const cropsSet = new Set<string>();
      
      offerings.forEach(offering => {
        const product = productMasters.find(p => p.id === offering.productId);
        if (product) {
          const simpleCategory = SIMPLE_CATEGORY[product.category] || 'Other';
          if (!categories.includes(simpleCategory)) {
            categories.push(simpleCategory);
          }
          categoryCounts[simpleCategory] = (categoryCounts[simpleCategory] || 0) + 1;
          
          // Check if this product is used in current season
          if (productToCrops[product.id]) {
            productToCrops[product.id].forEach(cropName => cropsSet.add(cropName));
          }
        }
      });
      
      // Find primary category (most common)
      let primaryCategory = 'Mixed';
      let maxCount = 0;
      Object.entries(categoryCounts).forEach(([cat, count]) => {
        if (count > maxCount) {
          maxCount = count;
          primaryCategory = cat;
        }
      });
      // If multiple categories are close, call it Mixed
      const totalProducts = offerings.length;
      if (totalProducts > 0 && maxCount < totalProducts * 0.6) {
        primaryCategory = 'Mixed';
      }
      
      const preferredCount = offerings.filter(o => o.isPreferred).length;
      const usedInCrops = Array.from(cropsSet);
      
      stats[vendor.id] = {
        productCount: offerings.length,
        preferredCount,
        hasPreferred: preferredCount > 0,
        categories,
        primaryCategory,
        usedInCrops,
        isKeyVendor: preferredCount > 0 || usedInCrops.length > 0,
      };
    });
    
    return stats;
  }, [vendors, vendorOfferings, productMasters, currentSeason]);

  // Split vendors into key and all
  const { keyVendors, allVendors } = useMemo(() => {
    const key: Vendor[] = [];
    const all: Vendor[] = [];
    
    vendors.forEach(v => {
      const stats = vendorStats[v.id];
      if (stats?.isKeyVendor) {
        key.push(v);
      }
      all.push(v);
    });
    
    // Sort key vendors by product count descending
    key.sort((a, b) => (vendorStats[b.id]?.productCount || 0) - (vendorStats[a.id]?.productCount || 0));
    
    return { keyVendors: key, allVendors: all };
  }, [vendors, vendorStats]);

  // Filter vendors by search
  const filteredKeyVendors = useMemo(() => {
    if (!searchQuery.trim()) return keyVendors;
    const query = searchQuery.toLowerCase();
    return keyVendors.filter(v => 
      v.name.toLowerCase().includes(query) ||
      (v.tags || []).some(t => TAG_LABELS[t].toLowerCase().includes(query))
    );
  }, [keyVendors, searchQuery]);

  const filteredAllVendors = useMemo(() => {
    if (!searchQuery.trim()) return allVendors;
    const query = searchQuery.toLowerCase();
    return allVendors.filter(v => 
      v.name.toLowerCase().includes(query) ||
      (v.tags || []).some(t => TAG_LABELS[t].toLowerCase().includes(query))
    );
  }, [allVendors, searchQuery]);

  const handleAddVendor = () => {
    if (!newVendorName.trim()) return;
    const vendor: Vendor = {
      id: generateId(),
      name: newVendorName.trim(),
      contactEmail: newVendorEmail || undefined,
      contactPhone: newVendorPhone || undefined,
      website: newVendorWebsite || undefined,
      contacts: [],
      documents: [],
      tags: [],
    };
    onUpdateVendors([...vendors, vendor]);
    setShowAddVendor(false);
    setNewVendorName('');
    setNewVendorEmail('');
    setNewVendorPhone('');
    setNewVendorWebsite('');
  };

  const VendorRow: React.FC<{ vendor: Vendor }> = ({ vendor }) => {
    const stats = vendorStats[vendor.id] || { 
      productCount: 0, 
      preferredCount: 0, 
      hasPreferred: false,
      categories: [], 
      primaryCategory: 'Other',
      usedInCrops: [],
      isKeyVendor: false,
    };
    
    return (
      <div
        onClick={() => onSelectVendor(vendor.id)}
        className="px-4 py-3 flex items-center gap-4 hover:bg-muted/50 cursor-pointer transition-colors"
      >
        {/* Vendor name - primary */}
        <span className="font-medium text-foreground flex-1 min-w-0 truncate">
          {vendor.name}
        </span>
        
        {/* Product count - muted */}
        <span className="text-sm text-muted-foreground w-24 text-right shrink-0">
          {stats.productCount} {stats.productCount === 1 ? 'product' : 'products'}
        </span>
        
        {/* Primary category badge */}
        <Badge variant="secondary" className="text-xs w-28 justify-center shrink-0">
          {stats.primaryCategory}
        </Badge>
        
        {/* Preferred star */}
        <div className="w-6 shrink-0 flex justify-center">
          {stats.hasPreferred && (
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>
        
        {/* Used this season */}
        <div className="w-44 text-right shrink-0">
          {stats.usedInCrops.length > 0 && (
            <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
              <Check className="w-3.5 h-3.5 text-primary" />
              {stats.usedInCrops.join(', ')}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Vendors</h2>
          <p className="text-muted-foreground mt-1">{vendors.length} suppliers</p>
        </div>
        <button 
          onClick={() => setShowAddVendor(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
        >
          <Plus className="w-5 h-5" />
          Add Vendor
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search vendors..."
          className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Add Vendor Modal */}
      {showAddVendor && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-lg text-foreground">Add New Vendor</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Vendor Name *</label>
                <input 
                  type="text" 
                  value={newVendorName} 
                  onChange={(e) => setNewVendorName(e.target.value)} 
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background" 
                  placeholder="e.g., BioAg Management"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Website</label>
                <input 
                  type="url" 
                  value={newVendorWebsite} 
                  onChange={(e) => setNewVendorWebsite(e.target.value)} 
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background" 
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Contact Email</label>
                <input 
                  type="email" 
                  value={newVendorEmail} 
                  onChange={(e) => setNewVendorEmail(e.target.value)} 
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Contact Phone</label>
                <input 
                  type="tel" 
                  value={newVendorPhone} 
                  onChange={(e) => setNewVendorPhone(e.target.value)} 
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background" 
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button 
                onClick={() => setShowAddVendor(false)} 
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddVendor} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
              >
                Add Vendor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KEY VENDORS SECTION */}
      {filteredKeyVendors.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Key Vendors
          </h3>
          <div className="bg-card rounded-lg border border-border divide-y divide-border">
            {filteredKeyVendors.map(vendor => (
              <VendorRow key={vendor.id} vendor={vendor} />
            ))}
          </div>
        </div>
      )}

      {/* ALL VENDORS SECTION */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          All Vendors ({filteredAllVendors.length})
        </h3>
        {filteredAllVendors.length > 0 ? (
          <div className="bg-card rounded-lg border border-border divide-y divide-border">
            {filteredAllVendors.map(vendor => (
              <VendorRow key={vendor.id} vendor={vendor} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? 'No vendors match your search' : 'No vendors yet. Add your first vendor to get started.'}
          </div>
        )}
      </div>
    </div>
  );
};
