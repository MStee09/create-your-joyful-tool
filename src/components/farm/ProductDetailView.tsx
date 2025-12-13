import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Droplets, 
  Weight, 
  FileText, 
  Upload, 
  X, 
  Edit2, 
  Check,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  BadgeCheck,
} from 'lucide-react';
import type { 
  ProductMaster, 
  VendorOffering, 
  Vendor, 
  InventoryItem, 
  ProductCategory 
} from '@/types';
import { 
  formatCurrency, 
  formatNumber, 
  generateId,
  calculateCostPerPound,
  getStockStatus,
  CATEGORY_LABELS,
} from '@/lib/calculations';
import { Breadcrumb } from './Breadcrumb';
import { VendorOfferingsTable } from './VendorOfferingsTable';
import { ProductPurposeEditor } from './ProductPurposeEditor';
import { RoleSuggestionPanel } from './RoleSuggestionPanel';
import { useProductIntelligence } from '@/hooks/useProductIntelligence';
import type { ProductPurpose, ProductRole, RoleSuggestion } from '@/types/productIntelligence';
import { PRODUCT_ROLE_LABELS } from '@/types/productIntelligence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
interface ProductDetailViewProps {
  product: ProductMaster;
  vendorOfferings: VendorOffering[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  onUpdateProduct: (product: ProductMaster) => void;
  onUpdateOfferings: (offerings: VendorOffering[]) => void;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
  onBack: () => void;
  onNavigateToVendor?: (vendorId: string) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  vendorOfferings,
  vendors,
  inventory,
  onUpdateProduct,
  onUpdateOfferings,
  onUpdateInventory,
  onBack,
  onNavigateToVendor,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'purpose' | 'notes'>('details');
  const [editingDensity, setEditingDensity] = useState(false);
  const [densityValue, setDensityValue] = useState(product.densityLbsPerGal || 0);
  const [editingReorder, setEditingReorder] = useState(false);
  const [reorderValue, setReorderValue] = useState(product.reorderPoint || 0);
  const [isSuggestingRoles, setIsSuggestingRoles] = useState(false);
  
  // Role suggestion review state
  const [pendingSuggestions, setPendingSuggestions] = useState<RoleSuggestion[] | null>(null);
  const [suggestionSourceInfo, setSuggestionSourceInfo] = useState<string>('');

  // Product intelligence
  const { getPurpose, savePurpose, getAnalysis } = useProductIntelligence();
  const purpose = getPurpose(product.id);
  const analysis = getAnalysis(product.id);

  // Get stock info
  const productInventory = inventory.filter(i => i.productId === product.id);
  const stockInfo = getStockStatus(product, inventory);
  
  // Get preferred offering for calculations
  const preferredOffering = vendorOfferings.find(o => o.productId === product.id && o.isPreferred)
    || vendorOfferings.find(o => o.productId === product.id);
  const preferredVendor = preferredOffering ? vendors.find(v => v.id === preferredOffering.vendorId) : null;

  // Calculations
  const costPerLb = preferredOffering ? calculateCostPerPound(preferredOffering, product) : null;

  const handleSaveDensity = () => {
    onUpdateProduct({ ...product, densityLbsPerGal: densityValue || undefined });
    setEditingDensity(false);
  };

  const handleSaveReorder = () => {
    onUpdateProduct({ 
      ...product, 
      reorderPoint: reorderValue || undefined,
      reorderUnit: product.form === 'liquid' ? 'gal' : 'lbs',
    });
    setEditingReorder(false);
  };

  const handleUploadDocument = (type: 'label' | 'sds', file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (type === 'label') {
        onUpdateProduct({ ...product, labelData: base64, labelFileName: file.name });
      } else {
        onUpdateProduct({ ...product, sdsData: base64, sdsFileName: file.name });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleViewDocument = (data: string) => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<iframe src="${data}" style="width:100%;height:100%;border:none;"></iframe>`);
    }
  };

  const handleRemoveDocument = (type: 'label' | 'sds') => {
    if (type === 'label') {
      onUpdateProduct({ ...product, labelData: undefined, labelFileName: undefined });
    } else {
      onUpdateProduct({ ...product, sdsData: undefined, sdsFileName: undefined });
    }
  };

  const handleUpdateNotes = (field: 'generalNotes' | 'mixingNotes' | 'cropRateNotes', value: string) => {
    onUpdateProduct({ ...product, [field]: value });
  };

  const handleAddInventory = () => {
    const newItem: InventoryItem = {
      id: generateId(),
      productId: product.id,
      quantity: 0,
      unit: product.form === 'liquid' ? 'gal' : 'lbs',
    };
    onUpdateInventory([...inventory, newItem]);
  };

  const handleUpdateInventoryItem = (itemId: string, updates: Partial<InventoryItem>) => {
    onUpdateInventory(inventory.map(i => i.id === itemId ? { ...i, ...updates } : i));
  };

  const handleDeleteInventoryItem = (itemId: string) => {
    onUpdateInventory(inventory.filter(i => i.id !== itemId));
  };

  const handleUpdateCategory = (category: ProductCategory) => {
    onUpdateProduct({ ...product, category });
  };

  const handleUpdatePurpose = (newPurpose: ProductPurpose) => {
    savePurpose(product.id, newPurpose);
  };

  // AI-powered role suggestion - now opens review panel instead of auto-saving
  const handleSuggestRoles = async () => {
    setIsSuggestingRoles(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-roles', {
        body: {
          productName: product.name,
          category: product.category,
          analysis: product.analysis,
          activeIngredients: product.activeIngredients,
        },
      });

      if (error) throw error;

      // New format with suggestions array
      const suggestions: RoleSuggestion[] = data.suggestions || [];
      const sourceInfo: string = data.sourceInfo || 'Based on product information';
      
      if (suggestions.length > 0) {
        // Show review panel instead of auto-saving
        setPendingSuggestions(suggestions);
        setSuggestionSourceInfo(sourceInfo);
      } else {
        toast.info('No roles could be suggested. Try adding more product details.');
      }
    } catch (error) {
      console.error('Role suggestion failed:', error);
      toast.error('Failed to suggest roles');
    } finally {
      setIsSuggestingRoles(false);
    }
  };

  // Handle accepting roles from the review panel
  const handleAcceptRoles = (roles: ProductRole[]) => {
    const newPurpose: ProductPurpose = {
      ...purpose,
      id: purpose?.id || crypto.randomUUID(),
      productId: product.id,
      roles,
      rolesConfirmed: true,
      confirmedAt: new Date().toISOString(),
    };
    savePurpose(product.id, newPurpose);
    setPendingSuggestions(null);
    toast.success(`Confirmed ${roles.length} role${roles.length !== 1 ? 's' : ''}`);
  };

  const handleCancelSuggestions = () => {
    setPendingSuggestions(null);
  };

  const StockStatusBadge = () => {
    if (stockInfo.status === 'out') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive rounded-full text-sm">
          <XCircle className="w-4 h-4" />
          Out of Stock
        </span>
      );
    }
    if (stockInfo.status === 'low') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
          <AlertTriangle className="w-4 h-4" />
          Low Stock
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
        <CheckCircle className="w-4 h-4" />
        In Stock
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Products', onClick: onBack },
          { label: product.name },
        ]} 
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={onBack} className="p-2 hover:bg-muted rounded-lg">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-3xl font-bold text-foreground">{product.name}</h2>
          </div>
          <div className="flex items-center gap-2 ml-11">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              product.form === 'liquid' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {product.form === 'liquid' ? 'Liquid' : 'Dry'}
            </span>
            <select
              value={product.category}
              onChange={(e) => handleUpdateCategory(e.target.value as ProductCategory)}
              className="px-2 py-0.5 rounded text-xs font-medium bg-muted border-0 cursor-pointer hover:bg-muted/80"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {product.analysis && (
              <span className="px-2 py-0.5 bg-muted rounded text-xs">
                {product.analysis.n}-{product.analysis.p}-{product.analysis.k}
                {product.analysis.s > 0 && `-${product.analysis.s}S`}
              </span>
            )}
          </div>
        </div>

        <div className="text-right space-y-2">
          <div className="flex items-center gap-3 justify-end">
            <div>
              <p className="text-sm text-muted-foreground">On Hand</p>
              <p className="text-2xl font-bold text-foreground">
                {formatNumber(stockInfo.totalOnHand, 0)} {product.form === 'liquid' ? 'gal' : 'lbs'}
              </p>
            </div>
            <StockStatusBadge />
          </div>
          {product.reorderPoint && (
            <p className="text-sm text-muted-foreground">
              Reorder at: {formatNumber(product.reorderPoint, 0)} {product.reorderUnit}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="col-span-2 space-y-6">
          {/* Conversions Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Conversions & Calculations</h3>
            <div className="grid grid-cols-3 gap-6">
              {product.form === 'liquid' && (
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Density (lbs/gal)</label>
                  {editingDensity ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={densityValue}
                        onChange={(e) => setDensityValue(Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-input rounded text-sm bg-background"
                      />
                      <button onClick={handleSaveDensity} className="p-1 text-primary hover:bg-primary/10 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingDensity(false)} className="p-1 text-muted-foreground hover:bg-muted rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setEditingDensity(true); setDensityValue(product.densityLbsPerGal || 0); }}
                      className="flex items-center gap-2 text-foreground hover:text-primary"
                    >
                      <span className="text-lg font-semibold">
                        {product.densityLbsPerGal ? formatNumber(product.densityLbsPerGal, 1) : '—'}
                      </span>
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              
              {preferredOffering && (
                <>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Cost per lb</label>
                    <p className="text-lg font-semibold text-foreground">
                      {costPerLb ? formatCurrency(costPerLb) : '—'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Best Price</label>
                    <p className="text-lg font-semibold text-primary">
                      {formatCurrency(preferredOffering.price)}/{preferredOffering.priceUnit}
                    </p>
                    <p className="text-xs text-muted-foreground">{preferredVendor?.name}</p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Reorder Point</label>
                {editingReorder ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={reorderValue}
                      onChange={(e) => setReorderValue(Number(e.target.value))}
                      className="w-20 px-2 py-1 border border-input rounded text-sm bg-background"
                    />
                    <span className="text-sm text-muted-foreground">{product.form === 'liquid' ? 'gal' : 'lbs'}</span>
                    <button onClick={handleSaveReorder} className="p-1 text-primary hover:bg-primary/10 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingReorder(false)} className="p-1 text-muted-foreground hover:bg-muted rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { setEditingReorder(true); setReorderValue(product.reorderPoint || 0); }}
                    className="flex items-center gap-2 text-foreground hover:text-primary"
                  >
                    <span className="text-lg font-semibold">
                      {product.reorderPoint ? formatNumber(product.reorderPoint, 0) : '—'}
                    </span>
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Vendor Offerings */}
          <div className="bg-card rounded-xl border border-border p-6">
            <VendorOfferingsTable
              product={product}
              offerings={vendorOfferings}
              vendors={vendors}
              onUpdateOfferings={onUpdateOfferings}
              onNavigateToVendor={onNavigateToVendor}
            />
          </div>

          {/* Purpose & Roles Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Purpose & Roles</h3>
                {purpose?.rolesConfirmed && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    <BadgeCheck className="w-3 h-3" />
                    Confirmed
                  </span>
                )}
              </div>
              {!pendingSuggestions && (
                <button
                  onClick={handleSuggestRoles}
                  disabled={isSuggestingRoles}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 disabled:opacity-50"
                >
                  {isSuggestingRoles ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isSuggestingRoles ? 'Analyzing...' : 'AI Suggest Roles'}
                </button>
              )}
            </div>
            
            {/* Show suggestion review panel when suggestions are pending */}
            {pendingSuggestions ? (
              <RoleSuggestionPanel
                suggestions={pendingSuggestions}
                sourceInfo={suggestionSourceInfo}
                onAcceptAll={handleAcceptRoles}
                onAcceptSelected={handleAcceptRoles}
                onCancel={handleCancelSuggestions}
              />
            ) : (
              <ProductPurposeEditor
                purpose={purpose}
                analysis={analysis}
                productName={product.name}
                onUpdate={handleUpdatePurpose}
              />
            )}
          </div>

          {/* Inventory Lots */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Inventory</h3>
              <button
                onClick={handleAddInventory}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                <Plus className="w-4 h-4" />
                Add Lot
              </button>
            </div>

            {productInventory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center bg-muted/50 rounded-lg">
                No inventory tracked. Add a lot to track quantities.
              </p>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Lot #</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Quantity</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Location</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Received</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Expires</th>
                      <th className="px-3 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {productInventory.map(item => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.lotNumber || ''}
                            onChange={(e) => handleUpdateInventoryItem(item.id, { lotNumber: e.target.value })}
                            placeholder="—"
                            className="w-full bg-transparent border-0 p-0 focus:ring-0"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateInventoryItem(item.id, { quantity: Number(e.target.value) })}
                              className="w-20 px-2 py-1 border border-input rounded text-sm text-right bg-background"
                            />
                            <span className="text-muted-foreground">{item.unit}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.location || ''}
                            onChange={(e) => handleUpdateInventoryItem(item.id, { location: e.target.value })}
                            placeholder="Shop"
                            className="w-full bg-transparent border-0 p-0 focus:ring-0 text-muted-foreground"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={item.receivedDate || ''}
                            onChange={(e) => handleUpdateInventoryItem(item.id, { receivedDate: e.target.value })}
                            className="bg-transparent border-0 p-0 focus:ring-0 text-muted-foreground"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={item.expirationDate || ''}
                            onChange={(e) => handleUpdateInventoryItem(item.id, { expirationDate: e.target.value })}
                            className="bg-transparent border-0 p-0 focus:ring-0 text-muted-foreground"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleDeleteInventoryItem(item.id)}
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Documents & Notes */}
        <div className="space-y-6">
          {/* Documents Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Documents</h3>
            <div className="space-y-4">
              {/* Product Label */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Product Label</label>
                {product.labelData ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg">
                    <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.labelFileName || 'Label.pdf'}</p>
                    </div>
                    <button
                      onClick={() => handleViewDocument(product.labelData!)}
                      className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleRemoveDocument('label')}
                      className="p-1 text-muted-foreground hover:text-destructive rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload PDF</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadDocument('label', file);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* SDS */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Safety Data Sheet (SDS)</label>
                {product.sdsData ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg">
                    <FileText className="w-8 h-8 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.sdsFileName || 'SDS.pdf'}</p>
                    </div>
                    <button
                      onClick={() => handleViewDocument(product.sdsData!)}
                      className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleRemoveDocument('sds')}
                      className="p-1 text-muted-foreground hover:text-destructive rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload PDF</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadDocument('sds', file);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Notes</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">General Notes</label>
                <textarea
                  value={product.generalNotes || ''}
                  onChange={(e) => handleUpdateNotes('generalNotes', e.target.value)}
                  placeholder="Product info, storage requirements..."
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none h-20 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Mixing / Compatibility</label>
                <textarea
                  value={product.mixingNotes || ''}
                  onChange={(e) => handleUpdateNotes('mixingNotes', e.target.value)}
                  placeholder="Mix order, jar test results..."
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none h-20 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Crop Rate Notes</label>
                <textarea
                  value={product.cropRateNotes || ''}
                  onChange={(e) => handleUpdateNotes('cropRateNotes', e.target.value)}
                  placeholder="What rates worked well, observations..."
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none h-20 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Active Ingredients */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Active Ingredients</h3>
            <textarea
              value={product.activeIngredients || ''}
              onChange={(e) => onUpdateProduct({ ...product, activeIngredients: e.target.value })}
              placeholder="List active ingredients or guaranteed analysis..."
              className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none h-24 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
