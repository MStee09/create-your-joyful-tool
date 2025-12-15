import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Droplets, 
  Weight, 
  FileText, 
  StickyNote,
  AlertTriangle,
  Star,
  Filter,
} from 'lucide-react';
import type { ProductMaster, VendorOffering, Vendor, InventoryItem, ProductCategory } from '@/types';
import { 
  formatCurrency, 
  generateId, 
  getStockStatus, 
  CATEGORY_LABELS,
  inferProductCategory,
} from '@/lib/calculations';

interface ProductsListViewProps {
  productMasters: ProductMaster[];
  vendorOfferings: VendorOffering[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  onSelectProduct: (productId: string) => void;
  onAddProduct: (product: ProductMaster) => void;
}

export const ProductsListView: React.FC<ProductsListViewProps> = ({
  productMasters,
  vendorOfferings,
  vendors,
  inventory,
  onSelectProduct,
  onAddProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ProductCategory | ''>('');
  const [filterForm, setFilterForm] = useState<'liquid' | 'dry' | ''>('');
  const [filterVendor, setFilterVendor] = useState<string>('');
  const [filterStock, setFilterStock] = useState<'low' | 'out' | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<ProductMaster>>({
    form: 'liquid',
    category: 'other',
    defaultUnit: 'gal',
  });

  // Filter and enrich products
  const filteredProducts = useMemo(() => {
    return productMasters
      .map(product => {
        const offerings = vendorOfferings.filter(o => o.productId === product.id);
        const preferredOffering = offerings.find(o => o.isPreferred) || offerings[0];
        const vendor = preferredOffering ? vendors.find(v => v.id === preferredOffering.vendorId) : null;
        const stockInfo = getStockStatus(product, inventory);

        return {
          ...product,
          preferredOffering,
          vendor,
          stockStatus: stockInfo.status,
          totalOnHand: stockInfo.totalOnHand,
        };
      })
      .filter(product => {
        // Search filter
        if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        // Category filter
        if (filterCategory && product.category !== filterCategory) {
          return false;
        }
        // Form filter
        if (filterForm && product.form !== filterForm) {
          return false;
        }
        // Vendor filter
        if (filterVendor && product.preferredOffering?.vendorId !== filterVendor) {
          return false;
        }
        // Stock filter
        if (filterStock && product.stockStatus !== filterStock) {
          return false;
        }
        return true;
      });
  }, [productMasters, vendorOfferings, vendors, inventory, searchTerm, filterCategory, filterForm, filterVendor, filterStock]);

  // Group by category for display
  const groupedProducts = useMemo(() => {
    const groups: Record<string, typeof filteredProducts> = {};
    filteredProducts.forEach(product => {
      const categoryLabel = CATEGORY_LABELS[product.category] || 'Other';
      if (!groups[categoryLabel]) groups[categoryLabel] = [];
      groups[categoryLabel].push(product);
    });
    return groups;
  }, [filteredProducts]);

  const handleAddProduct = () => {
    if (!newProduct.name?.trim()) return;
    
    const product: ProductMaster = {
      id: generateId(),
      name: newProduct.name.trim(),
      category: inferProductCategory(newProduct.name, newProduct.form || 'liquid'),
      form: newProduct.form || 'liquid',
      defaultUnit: newProduct.form === 'liquid' ? 'gal' : 'lbs',
    };
    
    onAddProduct(product);
    setShowAddModal(false);
    setNewProduct({ form: 'liquid', category: 'other', defaultUnit: 'gal' });
    
    // Navigate to the new product's detail page
    onSelectProduct(product.id);
  };

  const activeFiltersCount = [filterCategory, filterForm, filterVendor, filterStock].filter(Boolean).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Products</h2>
          <p className="text-muted-foreground mt-1">{productMasters.length} products in catalog</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            activeFiltersCount > 0 
              ? 'border-primary bg-primary/10 text-primary' 
              : 'border-input bg-background text-foreground hover:bg-muted'
          }`}
        >
          <Filter className="w-5 h-5" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="flex gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as ProductCategory | '')}
            className="px-3 py-2 border border-input rounded-lg bg-background text-sm"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filterForm}
            onChange={(e) => setFilterForm(e.target.value as 'liquid' | 'dry' | '')}
            className="px-3 py-2 border border-input rounded-lg bg-background text-sm"
          >
            <option value="">All Forms</option>
            <option value="liquid">Liquid</option>
            <option value="dry">Dry</option>
          </select>
          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="px-3 py-2 border border-input rounded-lg bg-background text-sm"
          >
            <option value="">All Vendors</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <select
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value as 'low' | 'out' | '')}
            className="px-3 py-2 border border-input rounded-lg bg-background text-sm"
          >
            <option value="">Any Stock Level</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          {activeFiltersCount > 0 && (
            <button
              onClick={() => { setFilterCategory(''); setFilterForm(''); setFilterVendor(''); setFilterStock(''); }}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Products List */}
      <div className="space-y-6">
        {Object.entries(groupedProducts).map(([category, products]) => (
          <div key={category} className="bg-card rounded-xl shadow-sm border border-border">
            <div className="px-6 py-4 border-b border-border bg-muted/50 rounded-t-xl">
              <h3 className="font-semibold text-foreground">{category}</h3>
              <p className="text-sm text-muted-foreground">{products.length} products</p>
            </div>
            <div className="divide-y divide-border">
              {products.map(product => (
                <button
                  key={product.id}
                  onClick={() => onSelectProduct(product.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 text-left transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      product.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'
                    }`}>
                      {product.form === 'liquid' 
                        ? <Droplets className="w-5 h-5 text-blue-600" /> 
                        : <Weight className="w-5 h-5 text-amber-600" />
                      }
                    </div>
                    <div>
                      {/* Vendor name above product name */}
                      {product.vendor && (
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                          {product.vendor.name}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{product.name}</span>
                        {product.generalNotes && <StickyNote className="w-4 h-4 text-amber-500" />}
                        {product.labelFileName && <FileText className="w-4 h-4 text-blue-500" />}
                        {product.stockStatus === 'low' && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            Low
                          </span>
                        )}
                        {product.stockStatus === 'out' && (
                          <span className="px-1.5 py-0.5 bg-destructive/10 text-destructive rounded text-xs">
                            Out
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         {product.preferredOffering && (
                          <span>
                            {formatCurrency(product.preferredOffering.price)}/{product.preferredOffering.priceUnit}
                          </span>
                        )}
                        {product.analysis && (
                          <>
                            {product.preferredOffering && <span>•</span>}
                            <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
                              {product.analysis.n}-{product.analysis.p}-{product.analysis.k}
                              {product.analysis.s > 0 && `-${product.analysis.s}S`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {product.totalOnHand > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {product.totalOnHand} {product.form === 'liquid' ? 'gal' : 'lbs'} on hand
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm || activeFiltersCount > 0 
              ? 'No products match your filters.' 
              : 'No products yet. Click "Add Product" to get started.'
            }
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-sm m-4">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-lg">Add Product</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name</label>
                <input
                  type="text"
                  value={newProduct.name || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g., BioAg E"
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Form</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="productForm"
                      checked={newProduct.form === 'liquid'}
                      onChange={() => setNewProduct({ 
                        ...newProduct, 
                        form: 'liquid',
                        defaultUnit: 'gal',
                      })}
                      className="w-4 h-4 text-primary"
                    />
                    <Droplets className="w-4 h-4 text-blue-600" />
                    <span>Liquid</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="productForm"
                      checked={newProduct.form === 'dry'}
                      onChange={() => setNewProduct({ 
                        ...newProduct, 
                        form: 'dry',
                        defaultUnit: 'lbs',
                      })}
                      className="w-4 h-4 text-primary"
                    />
                    <Weight className="w-4 h-4 text-amber-600" />
                    <span>Dry</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button 
                onClick={() => setShowAddModal(false)} 
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddProduct}
                disabled={!newProduct.name?.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                Create Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
