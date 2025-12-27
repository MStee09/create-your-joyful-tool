import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Droplets, Weight, Package } from 'lucide-react';
import type { InventoryItem, Product, Vendor, Season } from '@/types/farm';
import { formatCurrency, generateId } from '@/utils/farmUtils';
import { ProductSelectorModal, type ProductWithContext } from './ProductSelectorModal';
import { AddInventoryModal, type PriceHistory } from './AddInventoryModal';
import { formatInventoryDisplay, getDefaultPackagingOptions } from '@/lib/packagingUtils';

interface InventoryViewProps {
  inventory: InventoryItem[];
  products: Product[];
  vendors?: Vendor[];
  currentSeason?: Season | null;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ 
  inventory, 
  products, 
  vendors = [], 
  currentSeason = null,
  onUpdateInventory 
}) => {
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productContext, setProductContext] = useState<ProductWithContext | null>(null);

  const handleSelectProduct = (product: Product, context: ProductWithContext) => {
    setSelectedProduct(product);
    setProductContext(context);
    setShowProductSelector(false);
    setShowAddModal(true);
  };

  const handleBackToSelector = () => {
    setShowAddModal(false);
    setShowProductSelector(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setSelectedProduct(null);
    setProductContext(null);
  };

  const handleAddInventory = (data: {
    quantity: number;
    unit: string;
    packageType?: string;
    packageQuantity?: number;
    reason?: string;
    note?: string;
  }) => {
    if (!selectedProduct) return;
    
    const item: InventoryItem = {
      id: generateId(),
      productId: selectedProduct.id,
      quantity: data.quantity,
      unit: data.unit as 'gal' | 'lbs',
      packagingName: data.packageType,
      packagingSize: data.packageQuantity ? data.quantity / data.packageQuantity : undefined,
      containerCount: data.packageQuantity,
    };
    
    // Check if we have existing inventory for this product with same packaging
    const existing = inventory.find(i => 
      i.productId === item.productId && 
      i.packagingName === item.packagingName &&
      i.packagingSize === item.packagingSize
    );
    
    if (existing) {
      // Merge quantities
      onUpdateInventory(inventory.map(i => 
        i.id === existing.id 
          ? { 
              ...i, 
              quantity: i.quantity + item.quantity,
              containerCount: (i.containerCount || 0) + (item.containerCount || 0)
            } 
          : i
      ));
    } else {
      onUpdateInventory([...inventory, item]);
    }
    
    handleCloseAddModal();
  };

  const handleCreatePurchase = (data: {
    quantity: number;
    unit: string;
    packageType?: string;
    packageQuantity?: number;
    vendorId: string;
    unitPrice: number;
    date: string;
    invoiceNumber?: string;
    seasonYear: number;
  }) => {
    // For now, just add inventory (purchase tracking can be added later)
    handleAddInventory({
      quantity: data.quantity,
      unit: data.unit,
      packageType: data.packageType,
      packageQuantity: data.packageQuantity,
    });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      onUpdateInventory(inventory.filter(i => i.id !== id));
    } else {
      const item = inventory.find(i => i.id === id);
      if (item && item.packagingSize && item.containerCount) {
        // Update container count based on new quantity
        const newContainerCount = Math.round(quantity / item.packagingSize);
        onUpdateInventory(inventory.map(i => 
          i.id === id 
            ? { ...i, quantity, containerCount: newContainerCount } 
            : i
        ));
      } else {
        onUpdateInventory(inventory.map(i => i.id === id ? { ...i, quantity } : i));
      }
    }
  };

  // Get vendor name for a product
  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.name;
  };

  // Build package options for selected product
  const packageOptions = useMemo(() => {
    if (!selectedProduct) return [];
    return getDefaultPackagingOptions(selectedProduct.form).map(p => ({
      label: p.name,
      size: p.unitSize,
      unit: p.unitType,
    }));
  }, [selectedProduct]);

  // Build used in list
  const usedIn = useMemo(() => {
    if (!productContext) return [];
    return productContext.usedIn.map(u => ({
      cropName: u.split(' → ')[0] || u,
      timingName: u.split(' → ')[1] || '',
    }));
  }, [productContext]);

  // Get vendor for selected product
  const selectedVendor = useMemo(() => {
    if (!selectedProduct) return null;
    return vendors.find(v => v.id === selectedProduct.vendorId) || null;
  }, [selectedProduct, vendors]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Inventory</h2>
          <p className="text-muted-foreground mt-1">Track your on-hand product quantities</p>
        </div>
        <button 
          onClick={() => setShowProductSelector(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
        >
          <Plus className="w-5 h-5" />Add Inventory
        </button>
      </div>

      {/* Product Selector Modal */}
      <ProductSelectorModal
        open={showProductSelector}
        onOpenChange={setShowProductSelector}
        products={products}
        vendors={vendors}
        inventory={inventory}
        currentSeason={currentSeason}
        onSelectProduct={handleSelectProduct}
      />

      {/* Inventory Add Modal */}
      {showAddModal && selectedProduct && productContext && (
        <AddInventoryModal
          product={selectedProduct}
          vendor={selectedVendor}
          vendors={vendors}
          onHand={productContext.onHand}
          planNeeds={productContext.plannedUsage}
          unit={selectedProduct.form === 'liquid' ? 'gal' : 'lbs'}
          usedIn={usedIn}
          packageOptions={packageOptions}
          priceHistory={[]}
          currentSeasonYear={currentSeason?.year || new Date().getFullYear()}
          onClose={handleCloseAddModal}
          onAddInventory={handleAddInventory}
          onCreatePurchase={handleCreatePurchase}
        />
      )}

      <div className="bg-card rounded-xl shadow-sm border border-border">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Product</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">On Hand</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Value</th>
              <th className="px-6 py-4 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {inventory.map(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return null;
              const vendorName = getVendorName(product.vendorId);
              const value = product.form === 'liquid' 
                ? item.quantity * product.price 
                : item.quantity * (product.priceUnit === 'ton' ? product.price / 2000 : product.price);
              
              // Format container-based display
              const display = formatInventoryDisplay(
                item.containerCount,
                item.packagingName,
                item.packagingSize,
                item.quantity,
                item.unit
              );
              
              return (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        product.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'
                      }`}>
                        {product.form === 'liquid' 
                          ? <Droplets className="w-5 h-5 text-blue-600" /> 
                          : <Weight className="w-5 h-5 text-amber-600" />}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{vendorName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {item.containerCount && item.packagingName ? (
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{display.primary}</span>
                        </div>
                      ) : (
                        <span className="font-medium">{item.quantity.toFixed(1)} {item.unit}</span>
                      )}
                    </div>
                    {display.secondary && (
                      <div className="text-sm text-muted-foreground">{display.secondary}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-medium text-foreground">{formatCurrency(value)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => onUpdateInventory(inventory.filter(i => i.id !== item.id))}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {inventory.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No inventory items yet</p>
                    <p className="text-sm">Click "Add Inventory" to track your on-hand products</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
