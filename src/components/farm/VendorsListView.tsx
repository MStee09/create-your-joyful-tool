import React, { useState, useMemo } from 'react';
import { Plus, Building2, Search, Star, Package } from 'lucide-react';
import type { Vendor, VendorTag, ProductMaster, VendorOffering } from '@/types';
import { generateId, CATEGORY_LABELS } from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';

interface VendorsListViewProps {
  vendors: Vendor[];
  productMasters: ProductMaster[];
  vendorOfferings: VendorOffering[];
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

export const VendorsListView: React.FC<VendorsListViewProps> = ({
  vendors,
  productMasters,
  vendorOfferings,
  onUpdateVendors,
  onSelectVendor,
}) => {
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorWebsite, setNewVendorWebsite] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Get vendor stats
  const vendorStats = useMemo(() => {
    const stats: Record<string, { productCount: number; preferredCount: number; categories: string[] }> = {};
    
    vendors.forEach(vendor => {
      const offerings = vendorOfferings.filter(o => o.vendorId === vendor.id);
      const categories: string[] = [];
      
      offerings.forEach(offering => {
        const product = productMasters.find(p => p.id === offering.productId);
        if (product && !categories.includes(product.category)) {
          categories.push(product.category);
        }
      });
      
      stats[vendor.id] = {
        productCount: offerings.length,
        preferredCount: offerings.filter(o => o.isPreferred).length,
        categories,
      };
    });
    
    return stats;
  }, [vendors, vendorOfferings, productMasters]);

  // Filter vendors
  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const query = searchQuery.toLowerCase();
    return vendors.filter(v => 
      v.name.toLowerCase().includes(query) ||
      (v.tags || []).some(t => TAG_LABELS[t].toLowerCase().includes(query))
    );
  }, [vendors, searchQuery]);

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

      {/* Vendor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map(vendor => {
          const stats = vendorStats[vendor.id] || { productCount: 0, preferredCount: 0, categories: [] };
          const primaryTag = (vendor.tags || []).find(t => t.startsWith('primary-'));
          
          return (
            <div
              key={vendor.id}
              onClick={() => onSelectVendor(vendor.id)}
              className="bg-card rounded-xl border border-border p-5 hover:border-primary/50 hover:shadow-md cursor-pointer transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{vendor.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{stats.productCount} products</span>
                    {stats.preferredCount > 0 && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm text-muted-foreground">{stats.preferredCount} preferred</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Tags */}
              {((vendor.tags || []).length > 0 || stats.categories.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {primaryTag && (
                    <Badge variant="default" className="text-xs">
                      {TAG_LABELS[primaryTag]}
                    </Badge>
                  )}
                  {stats.categories.slice(0, 2).map(cat => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}
                    </Badge>
                  ))}
                  {stats.categories.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{stats.categories.length - 2} more
                    </Badge>
                  )}
                </div>
              )}

              {/* Contact preview */}
              {(vendor.contactEmail || vendor.contactPhone) && (
                <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border truncate">
                  {vendor.contactEmail || vendor.contactPhone}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredVendors.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? 'No vendors match your search' : 'No vendors yet. Add your first vendor to get started.'}
        </div>
      )}
    </div>
  );
};
