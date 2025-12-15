import React, { useState } from 'react';
import { Plus, Star, Trash2, Edit2, Check, X } from 'lucide-react';
import type { VendorOffering, Vendor, ProductMaster } from '@/types';
import { formatCurrency, generateId, calculateCostPerPound } from '@/lib/calculations';

interface VendorOfferingsTableProps {
  product: ProductMaster;
  offerings: VendorOffering[];
  vendors: Vendor[];
  onUpdateOfferings: (offerings: VendorOffering[]) => void;
  onNavigateToVendor?: (vendorId: string) => void;
}

export const VendorOfferingsTable: React.FC<VendorOfferingsTableProps> = ({
  product,
  offerings,
  vendors,
  onUpdateOfferings,
  onNavigateToVendor,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<VendorOffering>>({});

  const productOfferings = offerings.filter(o => o.productId === product.id);

  const handleAdd = () => {
    console.log('AddOffering clicked', formData);
    if (!formData.vendorId) {
      console.log('AddOffering validation failed: missing vendor');
      return;
    }

    const price = formData.price ?? 0;
    
    const newOffering: VendorOffering = {
      id: generateId(),
      productId: product.id,
      vendorId: formData.vendorId,
      price,
      priceUnit: formData.priceUnit || 'gal',
      packaging: formData.packaging,
      sku: formData.sku,
      lastQuotedDate: new Date().toISOString().split('T')[0],
      isPreferred: productOfferings.length === 0, // First one is preferred
    };
    
    console.log('AddOffering creating new offering', newOffering);
    onUpdateOfferings([...offerings, newOffering]);
    setShowAddForm(false);
    setFormData({});
  };

  const handleUpdate = (id: string) => {
    onUpdateOfferings(offerings.map(o => 
      o.id === id ? { ...o, ...formData } as VendorOffering : o
    ));
    setEditingId(null);
    setFormData({});
  };

  const handleDelete = (id: string) => {
    const toDelete = offerings.find(o => o.id === id);
    const remaining = offerings.filter(o => o.id !== id);
    
    // If we deleted the preferred one, make another preferred
    if (toDelete?.isPreferred) {
      const nextPreferred = remaining.find(o => o.productId === product.id);
      if (nextPreferred) {
        onUpdateOfferings(remaining.map(o => 
          o.id === nextPreferred.id ? { ...o, isPreferred: true } : o
        ));
        return;
      }
    }
    
    onUpdateOfferings(remaining);
  };

  const handleSetPreferred = (id: string) => {
    onUpdateOfferings(offerings.map(o => ({
      ...o,
      isPreferred: o.productId === product.id ? o.id === id : o.isPreferred,
    })));
  };

  const startEdit = (offering: VendorOffering) => {
    setEditingId(offering.id);
    setFormData({ ...offering });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Vendor Offerings</h4>
        <button
          onClick={() => { setShowAddForm(true); setFormData({}); }}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
        >
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </div>

      {productOfferings.length === 0 && !showAddForm && (
        <p className="text-sm text-muted-foreground py-4 text-center bg-muted/50 rounded-lg">
          No vendor offerings yet. Add a vendor to track pricing.
        </p>
      )}

      {productOfferings.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Vendor</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Price</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Packaging</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">$/lb</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground w-24">Preferred</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {productOfferings.map(offering => {
                const vendor = vendors.find(v => v.id === offering.vendorId);
                const costPerLb = calculateCostPerPound(offering, product);
                const isEditing = editingId === offering.id;

                return (
                  <tr key={offering.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select
                          value={formData.vendorId || offering.vendorId}
                          onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                          className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                        >
                          {vendors.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => onNavigateToVendor?.(offering.vendorId)}
                          className="text-primary hover:underline"
                        >
                          {vendor?.name || 'Unknown'}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isEditing ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            step="0.01"
                            value={formData.price ?? offering.price}
                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            className="w-20 px-2 py-1 border border-input rounded text-sm text-right bg-background"
                          />
                          <select
                            value={formData.priceUnit || offering.priceUnit}
                            onChange={(e) => setFormData({ ...formData, priceUnit: e.target.value as VendorOffering['priceUnit'] })}
                            className="px-1 py-1 border border-input rounded text-sm bg-background"
                          >
                            <option value="gal">/gal</option>
                            <option value="lbs">/lb</option>
                            <option value="ton">/ton</option>
                            <option value="case">/case</option>
                            <option value="tote">/tote</option>
                          </select>
                        </div>
                      ) : (
                        <span>{formatCurrency(offering.price)}/{offering.priceUnit}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.packaging ?? offering.packaging ?? ''}
                          onChange={(e) => setFormData({ ...formData, packaging: e.target.value })}
                          placeholder="e.g., 2.5 gal jug"
                          className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                        />
                      ) : (
                        <span className="text-muted-foreground">{offering.packaging || '-'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {costPerLb ? formatCurrency(costPerLb) : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleSetPreferred(offering.id)}
                        className={`p-1 rounded ${
                          offering.isPreferred 
                            ? 'text-amber-500' 
                            : 'text-muted-foreground hover:text-amber-500'
                        }`}
                        title={offering.isPreferred ? 'Preferred vendor' : 'Set as preferred'}
                      >
                        <Star className={`w-4 h-4 ${offering.isPreferred ? 'fill-current' : ''}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleUpdate(offering.id)}
                              className="p-1 text-primary hover:bg-primary/10 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setFormData({}); }}
                              className="p-1 text-muted-foreground hover:bg-muted rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(offering)}
                              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(offering.id)}
                              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
          <h5 className="font-medium text-sm">Add Vendor Offering</h5>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Vendor</label>
              <select
                value={formData.vendorId || ''}
                onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background"
              >
                <option value="">Select vendor...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Price</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.price ?? ''}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? undefined : Number(e.target.value) })}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 border border-input rounded-lg text-sm bg-background"
                />
                <select
                  value={formData.priceUnit || 'gal'}
                  onChange={(e) => setFormData({ ...formData, priceUnit: e.target.value as VendorOffering['priceUnit'] })}
                  className="px-2 py-2 border border-input rounded-lg text-sm bg-background"
                >
                  <option value="gal">/gal</option>
                  <option value="lbs">/lb</option>
                  <option value="ton">/ton</option>
                  <option value="case">/case</option>
                  <option value="tote">/tote</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Packaging</label>
              <input
                type="text"
                value={formData.packaging || ''}
                onChange={(e) => setFormData({ ...formData, packaging: e.target.value })}
                placeholder="e.g., 2.5 gal jug"
                className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">SKU / Part #</label>
              <input
                type="text"
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowAddForm(false); setFormData({}); }}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!formData.vendorId}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              Add Offering
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
