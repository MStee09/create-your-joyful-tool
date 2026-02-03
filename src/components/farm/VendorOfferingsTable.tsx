import React, { useState, useMemo } from 'react';
import { Plus, Star, Trash2, Edit2, Check, X, Calendar, AlertTriangle, TrendingDown } from 'lucide-react';
import type { VendorOffering, Vendor, ProductMaster } from '@/types';
import { formatCurrency, generateId, calculateCostPerPound } from '@/lib/calculations';
import { isLowestPrice } from '@/lib/pricingUtils';
import { Badge } from '@/components/ui/badge';

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter and sort offerings by price ascending (lowest first)
  const productOfferings = useMemo(() => {
    return offerings
      .filter(o => o.productId === product.id)
      .sort((a, b) => (a.price || 0) - (b.price || 0));
  }, [offerings, product.id]);

  const handleAdd = () => {
    if (!formData.vendorId) return;

    const price = formData.price ?? 0;
    const priceUnit = formData.priceUnit || (product.form === 'dry' ? 'lbs' : 'gal');
    const isContainerPriced = ['jug', 'bag', 'case', 'tote'].includes(priceUnit);

    const containerSize = isContainerPriced
      ? (formData.containerSize !== undefined && formData.containerSize !== null
          ? Number(formData.containerSize)
          : undefined)
      : undefined;

    const containerUnit = isContainerPriced
      ? (formData.containerUnit || (product.form === 'dry' ? 'g' : 'gal'))
      : undefined;

    const newOffering: VendorOffering = {
      id: generateId(),
      productId: product.id,
      vendorId: formData.vendorId,
      price,
      priceUnit,
      containerSize,
      containerUnit,
      packaging: formData.packaging,
      sku: formData.sku,
      minOrder: formData.minOrder,
      freightTerms: formData.freightTerms,
      lastQuotedDate: formData.lastQuotedDate || new Date().toISOString().split('T')[0],
      isPreferred: productOfferings.length === 0, // First one is preferred
    };

    onUpdateOfferings([...offerings, newOffering]);
    setShowAddForm(false);
    setFormData({});
  };

  const handleUpdate = (id: string) => {
    onUpdateOfferings(
      offerings.map(o => {
        if (o.id !== id) return o;

        const next = { ...o, ...formData } as VendorOffering;
        const priceUnit = next.priceUnit || o.priceUnit;
        const isContainerPriced = ['jug', 'bag', 'case', 'tote'].includes(priceUnit || '');

        // If user typed a container size but didn't touch the unit dropdown, default it.
        if (isContainerPriced) {
          const nextContainerSize =
            next.containerSize !== undefined && next.containerSize !== null && next.containerSize !== ('' as any)
              ? Number(next.containerSize)
              : undefined;

          return {
            ...next,
            containerSize: nextContainerSize,
            containerUnit: next.containerUnit || o.containerUnit || (product.form === 'dry' ? 'g' : 'gal'),
          };
        }

        // Not container priced -> clear container fields so saving never "drops" edits.
        return { ...next, containerSize: undefined, containerUnit: undefined };
      })
    );
    setEditingId(null);
    setFormData({});
  };

  const handleDeleteClick = (id: string) => {
    // Check if this is the last offering for this product
    if (productOfferings.length <= 1) {
      // Show confirmation dialog
      setDeleteConfirmId(id);
    } else {
      // Safe to delete directly
      handleDelete(id);
    }
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
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Vendor</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Price</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Contents</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Packaging</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">SKU</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">$/unit</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Min Order</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Quoted</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground w-16">Pref</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {productOfferings.map((offering, index) => {
                const vendor = vendors.find(v => v.id === offering.vendorId);
                const costPerLb = calculateCostPerPound(offering, product);
                const isEditing = editingId === offering.id;
                const isLowest = isLowestPrice(offering, offerings);

                return (
                  <tr
                    key={offering.id}
                    className={`hover:bg-muted/30 ${isEditing ? '' : 'cursor-pointer'}`}
                    onClick={() => {
                      if (!isEditing) startEdit(offering);
                    }}
                  >
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
                            {product.form === 'liquid' ? (
                              <>
                                <option value="gal">/gal</option>
                                <option value="tote">/tote</option>
                              </>
                            ) : (
                              <>
                                <option value="lbs">/lb</option>
                                <option value="g">/g</option>
                                <option value="ton">/ton</option>
                                <option value="bag">/bag</option>
                              </>
                            )}
                            <option value="jug">/jug</option>
                            <option value="case">/case</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>{formatCurrency(offering.price)}/{offering.priceUnit}</span>
                          {isLowest && productOfferings.length > 1 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 text-emerald-600 border-emerald-300 bg-emerald-50">
                              <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                              Lowest
                            </Badge>
                          )}
                        </div>
                      )}
                    </td>
                    {/* Contents - for container-based pricing */}
                    <td className="px-3 py-2">
                      {isEditing && ['jug', 'bag', 'case', 'tote'].includes(formData.priceUnit || offering.priceUnit || '') ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            value={formData.containerSize ?? offering.containerSize ?? ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                containerSize: e.target.value === '' ? undefined : Number(e.target.value),
                                // ensure unit is present even if user never opens the dropdown
                                containerUnit:
                                  formData.containerUnit ||
                                  offering.containerUnit ||
                                  (product.form === 'dry' ? 'g' : 'gal'),
                              })
                            }
                            placeholder="e.g., 1800"
                            className="w-20 px-2 py-1 border border-input rounded text-sm bg-background"
                          />
                          <select
                            value={formData.containerUnit || offering.containerUnit || (product.form === 'dry' ? 'g' : 'gal')}
                            onChange={(e) => setFormData({ ...formData, containerUnit: e.target.value as VendorOffering['containerUnit'] })}
                            className="px-1 py-1 border border-input rounded text-sm bg-background"
                          >
                            {product.form === 'dry' ? (
                              <>
                                <option value="g">g</option>
                                <option value="lbs">lbs</option>
                                <option value="oz">oz</option>
                              </>
                            ) : (
                              <>
                                <option value="gal">gal</option>
                              </>
                            )}
                          </select>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {offering.containerSize && offering.containerUnit 
                            ? `${offering.containerSize} ${offering.containerUnit}` 
                            : '-'}
                        </span>
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
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.sku ?? offering.sku ?? ''}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                          placeholder="SKU"
                          className="w-20 px-2 py-1 border border-input rounded text-sm bg-background"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">{offering.sku || '-'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {costPerLb ? formatCurrency(costPerLb) : '-'}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.minOrder ?? offering.minOrder ?? ''}
                          onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                          placeholder="e.g., 1 pallet"
                          className="w-24 px-2 py-1 border border-input rounded text-sm bg-background"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">{offering.minOrder || '-'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <input
                          type="date"
                          value={formData.lastQuotedDate ?? offering.lastQuotedDate ?? ''}
                          onChange={(e) => setFormData({ ...formData, lastQuotedDate: e.target.value })}
                          className="px-2 py-1 border border-input rounded text-sm bg-background"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {offering.lastQuotedDate ? new Date(offering.lastQuotedDate).toLocaleDateString() : '-'}
                        </span>
                      )}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(offering.id);
                              }}
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
                  value={formData.priceUnit || (product.form === 'dry' ? 'lbs' : 'gal')}
                  onChange={(e) => setFormData({ ...formData, priceUnit: e.target.value as VendorOffering['priceUnit'] })}
                  className="px-2 py-2 border border-input rounded-lg text-sm bg-background"
                >
                  {product.form === 'liquid' ? (
                    <>
                      <option value="gal">/gal</option>
                      <option value="tote">/tote</option>
                    </>
                  ) : (
                    <>
                      <option value="lbs">/lb</option>
                      <option value="g">/g</option>
                      <option value="ton">/ton</option>
                      <option value="bag">/bag</option>
                    </>
                  )}
                  <option value="jug">/jug</option>
                  <option value="case">/case</option>
                </select>
              </div>
            </div>
            {/* Container size - show when price is per container */}
            {['jug', 'bag', 'case', 'tote'].includes(formData.priceUnit || '') && (
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Contents per {formData.priceUnit}</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.containerSize ?? ''}
                    onChange={(e) => setFormData({ ...formData, containerSize: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder="e.g., 500"
                    className="flex-1 px-3 py-2 border border-input rounded-lg text-sm bg-background"
                  />
                  <select
                    value={formData.containerUnit || (product.form === 'dry' ? 'g' : 'gal')}
                    onChange={(e) => setFormData({ ...formData, containerUnit: e.target.value as VendorOffering['containerUnit'] })}
                    className="px-2 py-2 border border-input rounded-lg text-sm bg-background"
                  >
                    {product.form === 'dry' ? (
                      <>
                        <option value="g">grams</option>
                        <option value="lbs">lbs</option>
                        <option value="oz">oz</option>
                      </>
                    ) : (
                      <>
                        <option value="gal">gal</option>
                        <option value="oz">oz</option>
                      </>
                    )}
                  </select>
                </div>
                {formData.containerSize && formData.price && (
                  <p className="text-xs text-muted-foreground mt-1">
                    = ${(formData.price / formData.containerSize).toFixed(4)}/{formData.containerUnit || 'g'}
                  </p>
                )}
              </div>
            )}
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
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Min Order</label>
              <input
                type="text"
                value={formData.minOrder || ''}
                onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                placeholder="e.g., 1 pallet, 10 cases"
                className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Last Quoted</label>
              <input
                type="date"
                value={formData.lastQuotedDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, lastQuotedDate: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Freight Terms</label>
              <input
                type="text"
                value={formData.freightTerms || ''}
                onChange={(e) => setFormData({ ...formData, freightTerms: e.target.value })}
                placeholder="e.g., Free freight on orders over $2,000"
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

      {/* Delete Last Vendor Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-xl p-6 max-w-md mx-4 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-lg text-foreground">
                Remove Last Vendor?
              </h3>
            </div>
            <p className="text-muted-foreground mb-4">
              This is the only vendor for <strong className="text-foreground">{product.name}</strong>. 
              Removing it will leave the product without any vendor or pricing information.
            </p>
            <p className="text-sm text-amber-600 mb-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              ⚠️ Products without vendors cannot be used in crop plans for cost calculations.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg"
              >
                Keep Vendor
              </button>
              <button
                onClick={() => {
                  handleDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90"
              >
                Remove Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
