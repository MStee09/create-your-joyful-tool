import React, { useState } from 'react';
import { Plus, Trash2, Droplets, Weight, Package } from 'lucide-react';
import type { InventoryItem, Product, Vendor, Season } from '@/types/farm';
import { formatCurrency, generateId } from '@/utils/farmUtils';
import { ProductSelectorModal, type ProductWithContext } from './ProductSelectorModal';
import { InventoryAddModal } from './InventoryAddModal';
import { formatInventoryDisplay } from '@/lib/packagingUtils';

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

  const handleAddInventory = (item: InventoryItem) => {
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
    
    setShowAddModal(false);
    setSelectedProduct(null);
    setProductContext(null);
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
      <InventoryAddModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        selectedProduct={selectedProduct}
        productContext={productContext}
        onBack={handleBackToSelector}
        onAdd={handleAddInventory}
      />

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
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${product.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                        {product.form === 'liquid' ? <Droplets className="w-4 h-4 text-blue-600" /> : <Weight className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div>
                        {vendorName && (
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            {vendorName}
                          </p>
                        )}
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Container-based display */}
                      {item.containerCount && item.packagingName ? (
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{display.primary}</p>
                            <p className="text-xs text-muted-foreground">{display.secondary}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value))} 
                            className="w-24 px-2 py-1 text-right border border-input rounded bg-background" 
                            min={0} 
                          />
                          <span className="text-muted-foreground">{item.unit}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-primary">{formatCurrency(value)}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => onUpdateInventory(inventory.filter(i => i.id !== item.id))} 
                      className="p-2 text-muted-foreground hover:text-destructive rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {inventory.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No inventory items</p>
                  <p className="text-sm">Add products you have on hand</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
