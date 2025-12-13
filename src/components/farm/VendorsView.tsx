import React, { useState } from 'react';
import { Plus, Trash2, Building2 } from 'lucide-react';
import type { Vendor, Product } from '@/types/farm';
import { generateId } from '@/utils/farmUtils';

interface VendorsViewProps {
  vendors: Vendor[];
  products: Product[];
  onUpdateVendors: (vendors: Vendor[]) => void;
}

export const VendorsView: React.FC<VendorsViewProps> = ({ vendors, products, onUpdateVendors }) => {
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');

  const handleAddVendor = () => {
    if (!newVendorName.trim()) return;
    const vendor: Vendor = {
      id: generateId(),
      name: newVendorName.trim(),
      contactEmail: newVendorEmail || undefined,
      contactPhone: newVendorPhone || undefined,
    };
    onUpdateVendors([...vendors, vendor]);
    setShowAddVendor(false);
    setNewVendorName('');
    setNewVendorEmail('');
    setNewVendorPhone('');
  };

  const handleDeleteVendor = (id: string) => {
    onUpdateVendors(vendors.filter(v => v.id !== id));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Vendors</h2>
          <p className="text-muted-foreground mt-1">{vendors.length} suppliers</p>
        </div>
        <button onClick={() => setShowAddVendor(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90">
          <Plus className="w-5 h-5" />
          Add Vendor
        </button>
      </div>

      {showAddVendor && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-border"><h3 className="font-semibold text-lg">Add New Vendor</h3></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vendor Name</label>
                <input type="text" value={newVendorName} onChange={(e) => setNewVendorName(e.target.value)} className="w-full px-3 py-2 border border-input rounded-lg bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Email</label>
                <input type="email" value={newVendorEmail} onChange={(e) => setNewVendorEmail(e.target.value)} className="w-full px-3 py-2 border border-input rounded-lg bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Phone</label>
                <input type="tel" value={newVendorPhone} onChange={(e) => setNewVendorPhone(e.target.value)} className="w-full px-3 py-2 border border-input rounded-lg bg-background" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowAddVendor(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg">Cancel</button>
              <button onClick={handleAddVendor} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium">Add Vendor</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vendors.map(vendor => {
          const vendorProducts = products.filter(p => p.vendorId === vendor.id);
          return (
            <div key={vendor.id} className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{vendor.name}</h3>
                    <p className="text-sm text-muted-foreground">{vendorProducts.length} products</p>
                  </div>
                </div>
                <button onClick={() => handleDeleteVendor(vendor.id)} className="p-2 text-muted-foreground hover:text-destructive rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {(vendor.contactEmail || vendor.contactPhone) && (
                <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t border-border">
                  {vendor.contactEmail && <p>{vendor.contactEmail}</p>}
                  {vendor.contactPhone && <p>{vendor.contactPhone}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
