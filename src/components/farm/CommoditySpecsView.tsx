import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Package, 
  Link as LinkIcon,
  Unlink,
  Search,
  Droplets,
  Weight,
} from 'lucide-react';
import type { CommoditySpec, ProductMaster } from '@/types';
import { generateId } from '@/lib/calculations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface CommoditySpecsViewProps {
  commoditySpecs: CommoditySpec[];
  productMasters: ProductMaster[];
  onUpdateSpecs: (specs: CommoditySpec[]) => void;
  onUpdateProducts: (products: ProductMaster[]) => void;
}

export const CommoditySpecsView: React.FC<CommoditySpecsViewProps> = ({
  commoditySpecs,
  productMasters,
  onUpdateSpecs,
  onUpdateProducts,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSpec, setEditingSpec] = useState<CommoditySpec | null>(null);
  const [showLinkModal, setShowLinkModal] = useState<string | null>(null); // specId
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [specName, setSpecName] = useState('');
  const [specAnalysis, setSpecAnalysis] = useState('');
  const [specUom, setSpecUom] = useState<'ton' | 'gal' | 'lbs'>('ton');
  const [specCategory, setSpecCategory] = useState<'fertilizer' | 'chemical'>('fertilizer');
  
  // Get linked products for a spec
  const getLinkedProducts = (specId: string) => {
    return productMasters.filter(p => p.commoditySpecId === specId);
  };
  
  // Get eligible products for linking (bid-eligible, not linked to another spec)
  const eligibleProducts = useMemo(() => {
    return productMasters.filter(p => 
      p.isBidEligible && 
      (!p.commoditySpecId || p.commoditySpecId === showLinkModal)
    );
  }, [productMasters, showLinkModal]);
  
  const filteredEligibleProducts = useMemo(() => {
    if (!searchQuery) return eligibleProducts;
    return eligibleProducts.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [eligibleProducts, searchQuery]);
  
  const resetForm = () => {
    setSpecName('');
    setSpecAnalysis('');
    setSpecUom('ton');
    setSpecCategory('fertilizer');
  };
  
  const handleCreateSpec = () => {
    if (!specName.trim()) {
      toast.error('Spec name is required');
      return;
    }
    
    const newSpec: CommoditySpec = {
      id: generateId(),
      productId: '', // Will be set when linking products
      specName: specName.trim(),
      analysis: specAnalysis.trim() || undefined,
      uom: specUom,
      category: specCategory,
    };
    
    onUpdateSpecs([...commoditySpecs, newSpec]);
    setShowCreateModal(false);
    resetForm();
    toast.success('Commodity spec created');
  };
  
  const handleUpdateSpec = () => {
    if (!editingSpec || !specName.trim()) return;
    
    const updated: CommoditySpec = {
      ...editingSpec,
      specName: specName.trim(),
      analysis: specAnalysis.trim() || undefined,
      uom: specUom,
      category: specCategory,
    };
    
    onUpdateSpecs(commoditySpecs.map(s => s.id === editingSpec.id ? updated : s));
    setEditingSpec(null);
    resetForm();
    toast.success('Spec updated');
  };
  
  const handleDeleteSpec = (specId: string) => {
    // Unlink all products first
    const updatedProducts = productMasters.map(p => 
      p.commoditySpecId === specId ? { ...p, commoditySpecId: undefined } : p
    );
    onUpdateProducts(updatedProducts);
    onUpdateSpecs(commoditySpecs.filter(s => s.id !== specId));
    toast.success('Spec deleted');
  };
  
  const handleLinkProduct = (productId: string, specId: string) => {
    const spec = commoditySpecs.find(s => s.id === specId);
    onUpdateProducts(productMasters.map(p => 
      p.id === productId ? { ...p, commoditySpecId: specId } : p
    ));
    // Update spec's productId to first linked product
    if (spec && !spec.productId) {
      onUpdateSpecs(commoditySpecs.map(s => 
        s.id === specId ? { ...s, productId: productId } : s
      ));
    }
    toast.success('Product linked');
  };
  
  const handleUnlinkProduct = (productId: string) => {
    onUpdateProducts(productMasters.map(p => 
      p.id === productId ? { ...p, commoditySpecId: undefined } : p
    ));
    toast.success('Product unlinked');
  };
  
  const openEditModal = (spec: CommoditySpec) => {
    setEditingSpec(spec);
    setSpecName(spec.specName);
    setSpecAnalysis(spec.analysis || '');
    setSpecUom(spec.uom);
    setSpecCategory(spec.category);
  };
  
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">Commodity Specs</h2>
          <p className="text-stone-500 mt-1">
            Define canonical specifications for competitive bidding
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          New Spec
        </button>
      </div>
      
      {/* Empty State */}
      {commoditySpecs.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-stone-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-800 mb-2">No Commodity Specs</h3>
          <p className="text-stone-500 max-w-md mx-auto mb-6">
            Create specs like "AMS 21-0-0-24S" or "Glyphosate 4lb ae" to group products for competitive bidding.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Create First Spec
          </button>
        </div>
      )}
      
      {/* Specs Grid */}
      {commoditySpecs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {commoditySpecs.map(spec => {
            const linkedProducts = getLinkedProducts(spec.id);
            return (
              <div 
                key={spec.id} 
                className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        spec.category === 'fertilizer' ? 'bg-amber-100' : 'bg-purple-100'
                      }`}>
                        {spec.uom === 'gal' 
                          ? <Droplets className={`w-5 h-5 ${spec.category === 'fertilizer' ? 'text-amber-600' : 'text-purple-600'}`} />
                          : <Weight className={`w-5 h-5 ${spec.category === 'fertilizer' ? 'text-amber-600' : 'text-purple-600'}`} />
                        }
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-800">{spec.specName}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            spec.category === 'fertilizer' 
                              ? 'bg-amber-100 text-amber-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {spec.category}
                          </span>
                          <span className="text-xs text-stone-400">{spec.uom}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(spec)}
                        className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${spec.specName}"? Products will be unlinked.`)) {
                            handleDeleteSpec(spec.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {spec.analysis && (
                    <p className="text-sm text-stone-500 mb-4">{spec.analysis}</p>
                  )}
                  
                  {/* Linked Products */}
                  <div className="border-t border-stone-100 pt-4 mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                        Linked Products ({linkedProducts.length})
                      </span>
                      <button
                        onClick={() => {
                          setShowLinkModal(spec.id);
                          setSearchQuery('');
                        }}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                      >
                        <LinkIcon className="w-3 h-3" />
                        Link Product
                      </button>
                    </div>
                    
                    {linkedProducts.length === 0 ? (
                      <p className="text-sm text-stone-400 italic">No products linked yet</p>
                    ) : (
                      <div className="space-y-2">
                        {linkedProducts.map(product => (
                          <div 
                            key={product.id}
                            className="flex items-center justify-between py-1.5 px-2 bg-stone-50 rounded"
                          >
                            <span className="text-sm text-stone-700">{product.name}</span>
                            <button
                              onClick={() => handleUnlinkProduct(product.id)}
                              className="p-1 text-stone-400 hover:text-red-500 rounded"
                              title="Unlink product"
                            >
                              <Unlink className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal || !!editingSpec} onOpenChange={() => {
        setShowCreateModal(false);
        setEditingSpec(null);
        resetForm();
      }}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{editingSpec ? 'Edit' : 'Create'} Commodity Spec</DialogTitle>
            <DialogDescription>
              Define a canonical specification for competitive bidding
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Spec Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={specName}
                onChange={(e) => setSpecName(e.target.value)}
                placeholder="e.g., AMS 21-0-0-24S"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Analysis (optional)
              </label>
              <input
                type="text"
                value={specAnalysis}
                onChange={(e) => setSpecAnalysis(e.target.value)}
                placeholder="e.g., 21% N, 24% S as sulfate"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
                <select
                  value={specCategory}
                  onChange={(e) => setSpecCategory(e.target.value as 'fertilizer' | 'chemical')}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="fertilizer">Fertilizer</option>
                  <option value="chemical">Chemical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Unit of Measure</label>
                <select
                  value={specUom}
                  onChange={(e) => setSpecUom(e.target.value as 'ton' | 'gal' | 'lbs')}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="ton">Ton</option>
                  <option value="lbs">Pounds</option>
                  <option value="gal">Gallon</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setEditingSpec(null);
                resetForm();
              }}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={editingSpec ? handleUpdateSpec : handleCreateSpec}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
            >
              {editingSpec ? 'Save Changes' : 'Create Spec'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Link Product Modal */}
      <Dialog open={!!showLinkModal} onOpenChange={() => setShowLinkModal(null)}>
        <DialogContent className="bg-white max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Link Product to Spec</DialogTitle>
            <DialogDescription>
              Select a bid-eligible product to link to this commodity spec
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          
          <div className="mt-4 flex-1 overflow-y-auto max-h-[400px] space-y-2">
            {filteredEligibleProducts.length === 0 ? (
              <p className="text-center text-stone-500 py-8">
                {eligibleProducts.length === 0 
                  ? 'No bid-eligible products available. Mark products as bid-eligible first.'
                  : 'No products match your search.'}
              </p>
            ) : (
              filteredEligibleProducts.map(product => {
                const isLinked = product.commoditySpecId === showLinkModal;
                return (
                  <button
                    key={product.id}
                    onClick={() => {
                      if (showLinkModal) {
                        handleLinkProduct(product.id, showLinkModal);
                      }
                    }}
                    disabled={isLinked}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      isLinked 
                        ? 'bg-emerald-50 border-emerald-200 cursor-default'
                        : 'bg-white border-stone-200 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${
                      product.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'
                    }`}>
                      {product.form === 'liquid' 
                        ? <Droplets className="w-4 h-4 text-blue-600" />
                        : <Weight className="w-4 h-4 text-amber-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-800 truncate">{product.name}</p>
                      <p className="text-xs text-stone-400">{product.category}</p>
                    </div>
                    {isLinked && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <Check className="w-3 h-3" />
                        Linked
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          
          <div className="flex justify-end mt-4 pt-4 border-t border-stone-200">
            <button
              onClick={() => setShowLinkModal(null)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
