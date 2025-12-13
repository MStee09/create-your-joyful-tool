import React, { useState } from 'react';
import { Plus, Trash2, Droplets, Weight, Edit2, Check, X } from 'lucide-react';
import type { Product, Vendor, ProductForm } from '@/types/farm';
import { formatCurrency, generateId } from '@/utils/farmUtils';

interface ProductsViewProps {
  products: Product[];
  vendors: Vendor[];
  onUpdateProducts: (products: Product[]) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  vendors,
  onUpdateProducts,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState<string>('');

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    vendorId: vendors[0]?.id || '',
    name: '',
    price: 0,
    priceUnit: 'gal',
    form: 'liquid',
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVendor = !filterVendor || p.vendorId === filterVendor;
    return matchesSearch && matchesVendor;
  });

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.vendorId) return;
    const product: Product = {
      id: generateId(),
      vendorId: newProduct.vendorId!,
      name: newProduct.name!,
      price: newProduct.price || 0,
      priceUnit: newProduct.priceUnit as 'gal' | 'lbs' | 'ton',
      form: newProduct.form as ProductForm,
      analysis: newProduct.analysis,
    };
    onUpdateProducts([...products, product]);
    setShowAddProduct(false);
    setNewProduct({
      vendorId: vendors[0]?.id || '',
      name: '',
      price: 0,
      priceUnit: 'gal',
      form: 'liquid',
    });
  };

  const handleUpdateProduct = (id: string, updates: Partial<Product>) => {
    onUpdateProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDeleteProduct = (id: string) => {
    onUpdateProducts(products.filter(p => p.id !== id));
  };

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const vendor = vendors.find(v => v.id === product.vendorId);
    const vendorName = vendor?.name || 'Unknown';
    if (!acc[vendorName]) acc[vendorName] = [];
    acc[vendorName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Products</h2>
          <p className="text-muted-foreground mt-1">{products.length} products in catalog</p>
        </div>
        <button
          onClick={() => setShowAddProduct(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          />
        </div>
        <select
          value={filterVendor}
          onChange={(e) => setFilterVendor(e.target.value)}
          className="px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
        >
          <option value="">All Vendors</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg m-4">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-lg">Add New Product</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Product Name</label>
                <input
                  type="text"
                  value={newProduct.name || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Vendor</label>
                <select
                  value={newProduct.vendorId || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, vendorId: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Price</label>
                  <input
                    type="number"
                    value={newProduct.price || 0}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    step={0.01}
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Price Unit</label>
                  <select
                    value={newProduct.priceUnit || 'gal'}
                    onChange={(e) => setNewProduct({ ...newProduct, priceUnit: e.target.value as 'gal' | 'lbs' | 'ton' })}
                    className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  >
                    <option value="gal">per Gallon</option>
                    <option value="lbs">per Pound</option>
                    <option value="ton">per Ton</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Form</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="form"
                      value="liquid"
                      checked={newProduct.form === 'liquid'}
                      onChange={() => setNewProduct({ ...newProduct, form: 'liquid', priceUnit: 'gal' })}
                      className="text-primary"
                    />
                    <Droplets className="w-4 h-4 text-blue" />
                    Liquid
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="form"
                      value="dry"
                      checked={newProduct.form === 'dry'}
                      onChange={() => setNewProduct({ ...newProduct, form: 'dry', priceUnit: 'ton' })}
                      className="text-primary"
                    />
                    <Weight className="w-4 h-4 text-amber" />
                    Dry
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowAddProduct(false)}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products List by Vendor */}
      <div className="space-y-6">
        {Object.entries(groupedProducts).map(([vendorName, vendorProducts]) => (
          <div key={vendorName} className="bg-card rounded-xl shadow-sm border border-border">
            <div className="px-6 py-4 border-b border-border bg-muted/50 rounded-t-xl">
              <h3 className="font-semibold text-foreground">{vendorName}</h3>
              <p className="text-sm text-muted-foreground">{vendorProducts.length} products</p>
            </div>
            <div className="divide-y divide-border">
              {vendorProducts.map(product => (
                <div key={product.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      product.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'
                    }`}>
                      {product.form === 'liquid' ? (
                        <Droplets className="w-5 h-5 text-blue" />
                      ) : (
                        <Weight className="w-5 h-5 text-amber" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{product.name}</p>
                      {product.analysis && (
                        <p className="text-xs text-muted-foreground">
                          {product.analysis.n}-{product.analysis.p}-{product.analysis.k}
                          {product.analysis.s ? `-${product.analysis.s}S` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {editingId === product.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          defaultValue={product.price}
                          onBlur={(e) => {
                            handleUpdateProduct(product.id, { price: Number(e.target.value) });
                            setEditingId(null);
                          }}
                          className="w-24 px-2 py-1 border border-input rounded text-sm text-right bg-background"
                          autoFocus
                        />
                        <span className="text-muted-foreground text-sm">/{product.priceUnit}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingId(product.id)}
                        className="flex items-center gap-1 text-foreground hover:text-primary"
                      >
                        <span className="font-semibold">{formatCurrency(product.price)}</span>
                        <span className="text-muted-foreground text-sm">/{product.priceUnit}</span>
                        <Edit2 className="w-3 h-3 ml-1 text-muted-foreground" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
