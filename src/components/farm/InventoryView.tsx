import React, { useState } from 'react';
import { Plus, Trash2, Droplets, Weight } from 'lucide-react';
import type { InventoryItem, Product } from '@/types/farm';
import { formatCurrency, generateId } from '@/utils/farmUtils';

interface InventoryViewProps {
  inventory: InventoryItem[];
  products: Product[];
  onUpdateInventory: (inventory: InventoryItem[]) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ inventory, products, onUpdateInventory }) => {
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [newInventoryProductId, setNewInventoryProductId] = useState('');
  const [newInventoryQuantity, setNewInventoryQuantity] = useState(0);

  const handleAddInventory = () => {
    if (!newInventoryProductId || newInventoryQuantity <= 0) return;
    const product = products.find(p => p.id === newInventoryProductId);
    if (!product) return;
    
    const existing = inventory.find(i => i.productId === newInventoryProductId);
    if (existing) {
      onUpdateInventory(inventory.map(i => i.productId === newInventoryProductId ? { ...i, quantity: i.quantity + newInventoryQuantity } : i));
    } else {
      const item: InventoryItem = { id: generateId(), productId: newInventoryProductId, quantity: newInventoryQuantity, unit: product.form === 'liquid' ? 'gal' : 'lbs' };
      onUpdateInventory([...inventory, item]);
    }
    setShowAddInventory(false);
    setNewInventoryProductId('');
    setNewInventoryQuantity(0);
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) onUpdateInventory(inventory.filter(i => i.id !== id));
    else onUpdateInventory(inventory.map(i => i.id === id ? { ...i, quantity } : i));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Inventory</h2>
          <p className="text-muted-foreground mt-1">Track your on-hand product quantities</p>
        </div>
        <button onClick={() => setShowAddInventory(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90">
          <Plus className="w-5 h-5" />Add Inventory
        </button>
      </div>

      {showAddInventory && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-border"><h3 className="font-semibold text-lg">Add Inventory</h3></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product</label>
                <select value={newInventoryProductId} onChange={(e) => setNewInventoryProductId(e.target.value)} className="w-full px-3 py-2 border border-input rounded-lg bg-background">
                  <option value="">Select a product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input type="number" value={newInventoryQuantity} onChange={(e) => setNewInventoryQuantity(Number(e.target.value))} className="w-full px-3 py-2 border border-input rounded-lg bg-background" min={0} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowAddInventory(false)} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg">Cancel</button>
              <button onClick={handleAddInventory} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium">Add Inventory</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl shadow-sm border border-border">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Product</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">On Hand</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Value</th>
              <th className="px-6 py-4 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {inventory.map(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return null;
              const value = product.form === 'liquid' ? item.quantity * product.price : item.quantity * (product.priceUnit === 'ton' ? product.price / 2000 : product.price);
              return (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${product.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                        {product.form === 'liquid' ? <Droplets className="w-4 h-4 text-blue" /> : <Weight className="w-4 h-4 text-amber" />}
                      </div>
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input type="number" value={item.quantity} onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value))} className="w-24 px-2 py-1 text-right border border-input rounded bg-background" min={0} />
                      <span className="text-muted-foreground">{item.unit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-primary">{formatCurrency(value)}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => onUpdateInventory(inventory.filter(i => i.id !== item.id))} className="p-2 text-muted-foreground hover:text-destructive rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {inventory.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No inventory items. Add products you have on hand.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
