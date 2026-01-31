import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Droplets, 
  Weight, 
  FileText, 
  StickyNote,
  AlertTriangle,
  Filter,
  LayoutList,
  List,
  ArrowLeft,
  FlaskConical,
} from 'lucide-react';
import type { ProductMaster, VendorOffering, Vendor, InventoryItem, ProductCategory, Season, NutrientAnalysis } from '@/types';
import { 
  formatCurrency, 
  generateId, 
  getStockStatus, 
  CATEGORY_LABELS,
  inferProductCategory,
} from '@/lib/calculations';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Nutrient options for comparison mode
const NUTRIENT_OPTIONS = [
  { key: 'n', label: 'Nitrogen (N)' },
  { key: 'p', label: 'Phosphorus (P)' },
  { key: 'k', label: 'Potassium (K)' },
  { key: 's', label: 'Sulfur (S)' },
  { key: 'ca', label: 'Calcium (Ca)' },
  { key: 'mg', label: 'Magnesium (Mg)' },
  { key: 'b', label: 'Boron (B)' },
  { key: 'zn', label: 'Zinc (Zn)' },
  { key: 'mn', label: 'Manganese (Mn)' },
  { key: 'fe', label: 'Iron (Fe)' },
  { key: 'cu', label: 'Copper (Cu)' },
  { key: 'mo', label: 'Molybdenum (Mo)' },
  { key: 'co', label: 'Cobalt (Co)' },
];

interface ProductsListViewProps {
  productMasters: ProductMaster[];
  vendorOfferings: VendorOffering[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  currentSeason?: Season | null;
  onSelectProduct: (productId: string) => void;
  onAddProduct: (product: ProductMaster) => void;
}

type ViewDensity = 'compact' | 'detailed';

export const ProductsListView: React.FC<ProductsListViewProps> = ({
  productMasters,
  vendorOfferings,
  vendors,
  inventory,
  currentSeason,
  onSelectProduct,
  onAddProduct,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const [viewDensity, setViewDensity] = useState<ViewDensity>(() => {
    return (localStorage.getItem('productsViewDensity') as ViewDensity) || 'compact';
  });
  const [compareNutrient, setCompareNutrient] = useState<string | null>(null);

  // Helper function to calculate $/lb of nutrient
  const calculateCostPerLbNutrient = (
    product: ProductMaster,
    nutrientKey: string,
    price: number,
    priceUnit: string
  ): number | null => {
    const analysis = product.analysis;
    if (!analysis || !analysis[nutrientKey as keyof typeof analysis]) return null;
    
    const nutrientPercent = analysis[nutrientKey as keyof typeof analysis] as number;
    if (!nutrientPercent || nutrientPercent <= 0) return null;
    
    let pricePerLb: number;
    if (priceUnit === 'lbs') {
      pricePerLb = price;
    } else if (priceUnit === 'ton') {
      pricePerLb = price / 2000;
    } else if (priceUnit === 'gal') {
      const density = product.densityLbsPerGal || 10;
      pricePerLb = price / density;
    } else {
      return null;
    }
    
    return pricePerLb / (nutrientPercent / 100);
  };

  // Auto-focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Persist view density
  useEffect(() => {
    localStorage.setItem('productsViewDensity', viewDensity);
  }, [viewDensity]);

  // Get products used in current season
  const usedThisSeasonIds = useMemo(() => {
    if (!currentSeason) return new Set<string>();
    const ids = new Set<string>();
    currentSeason.crops.forEach(crop => {
      crop.applications.forEach(app => ids.add(app.productId));
      crop.seedTreatments.forEach(st => ids.add(st.productId));
    });
    return ids;
  }, [currentSeason]);

  // Filter and enrich products (sorted alphabetically)
  const filteredProducts = useMemo(() => {
    return [...productMasters]
      .sort((a, b) => a.name.localeCompare(b.name))
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
          usedThisSeason: usedThisSeasonIds.has(product.id),
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
  }, [productMasters, vendorOfferings, vendors, inventory, usedThisSeasonIds, searchTerm, filterCategory, filterForm, filterVendor, filterStock]);

  // Group by category for detailed view
  const groupedProducts = useMemo(() => {
    const groups: Record<string, typeof filteredProducts> = {};
    filteredProducts.forEach(product => {
      const categoryLabel = CATEGORY_LABELS[product.category] || 'Other';
      if (!groups[categoryLabel]) groups[categoryLabel] = [];
      groups[categoryLabel].push(product);
    });
    return groups;
  }, [filteredProducts]);

  // Separate used this season vs other products for compact view
  const { usedThisSeasonProducts, otherProducts } = useMemo(() => {
    const used = filteredProducts.filter(p => p.usedThisSeason);
    const other = filteredProducts.filter(p => !p.usedThisSeason);
    return { usedThisSeasonProducts: used, otherProducts: other };
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
    // Note: Don't auto-navigate - let state update complete first
    // User can click on the product after it appears in the list
  };

  const activeFiltersCount = [filterCategory, filterForm, filterVendor, filterStock].filter(Boolean).length;
  const hasActiveFiltersOrSearch = searchTerm.length > 0 || activeFiltersCount > 0;

  // Compact row component with hover card
  const CompactProductRow: React.FC<{ product: typeof filteredProducts[0] }> = ({ product }) => (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          onClick={() => onSelectProduct(product.id)}
          className="w-full px-4 py-2 flex items-center gap-3 hover:bg-muted/50 text-left transition-colors border-b border-border last:border-b-0"
        >
          {/* Form icon - small inline */}
          {product.form === 'liquid' ? (
            <Droplets className="w-4 h-4 text-blue-500 flex-shrink-0" />
          ) : (
            <Weight className="w-4 h-4 text-amber-500 flex-shrink-0" />
          )}
          
          {/* Product name */}
          <span className="font-medium text-foreground truncate min-w-0">
            {product.name}
          </span>
          
          {/* Vendor - muted */}
          {product.vendor && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-sm text-muted-foreground truncate">
                {product.vendor.name}
              </span>
            </>
          )}
          
          {/* Price */}
          {product.preferredOffering && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {formatCurrency(product.preferredOffering.price)}/{product.preferredOffering.priceUnit}
              </span>
            </>
          )}
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Stock status - only show if problematic */}
          {product.stockStatus === 'low' && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs whitespace-nowrap">
              <AlertTriangle className="w-3 h-3" />
              Low
            </span>
          )}
          {product.stockStatus === 'out' && (
            <span className="px-1.5 py-0.5 bg-destructive/10 text-destructive rounded text-xs whitespace-nowrap">
              Out
            </span>
          )}
          {product.stockStatus === 'ok' && product.totalOnHand > 0 && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {product.totalOnHand} {product.form === 'liquid' ? 'gal' : 'lbs'}
            </span>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-64">
        <div className="space-y-2">
          <div>
            <p className="font-medium text-foreground">{product.name}</p>
            {product.vendor && (
              <p className="text-xs text-muted-foreground">{product.vendor.name}</p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1">
            <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
              {CATEGORY_LABELS[product.category] || 'Other'}
            </span>
            <span className="px-1.5 py-0.5 bg-muted rounded text-xs capitalize">
              {product.form}
            </span>
          </div>
          
          {product.analysis && (
            <div className="text-xs">
              <span className="text-muted-foreground">Analysis: </span>
              <span className="font-medium">
                {product.analysis.n}-{product.analysis.p}-{product.analysis.k}
                {product.analysis.s > 0 && `-${product.analysis.s}S`}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {product.labelFileName && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-blue-500" />
                Label
              </span>
            )}
            {product.sdsFileName && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-orange-500" />
                SDS
              </span>
            )}
            {product.generalNotes && (
              <span className="flex items-center gap-1">
                <StickyNote className="w-3 h-3 text-amber-500" />
                Notes
              </span>
            )}
          </div>
          
          {product.usedThisSeason && currentSeason && (
            <div className="text-xs text-emerald-600 font-medium pt-1 border-t border-border">
              Used in {currentSeason.name} {currentSeason.year}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );

  // Detailed row component (existing style)
  const DetailedProductRow: React.FC<{ product: typeof filteredProducts[0] }> = ({ product }) => (
    <button
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
  );

  // Nutrient Comparison View
  if (compareNutrient) {
    const nutrientLabel = NUTRIENT_OPTIONS.find(o => o.key === compareNutrient)?.label || compareNutrient;
    const nutrientName = nutrientLabel.split(' ')[0];
    
    const productsWithNutrient = productMasters
      .map(product => {
        const offering = vendorOfferings.find(o => o.productId === product.id && o.isPreferred) 
          || vendorOfferings.find(o => o.productId === product.id);
        const vendor = offering ? vendors.find(v => v.id === offering.vendorId) : null;
        const price = offering?.price || 0;
        const priceUnit = offering?.priceUnit || 'gal';
        const costPerLb = calculateCostPerLbNutrient(product, compareNutrient, price, priceUnit);
        const nutrientPercent = product.analysis?.[compareNutrient as keyof NutrientAnalysis] as number;
        
        if (!costPerLb || !nutrientPercent) return null;
        
        return {
          product,
          vendor,
          price,
          priceUnit,
          nutrientPercent,
          costPerLb,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a?.costPerLb || 0) - (b?.costPerLb || 0)) as Array<{
        product: ProductMaster;
        vendor: Vendor | null | undefined;
        price: number;
        priceUnit: string;
        nutrientPercent: number;
        costPerLb: number;
      }>;
    
    return (
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Products Containing {nutrientLabel}</h2>
            <p className="text-muted-foreground">Sorted by cost per pound of {nutrientName}</p>
          </div>
          <Button variant="outline" onClick={() => setCompareNutrient(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Catalog
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Product</th>
                  <th className="text-right p-4 font-medium">{nutrientName} %</th>
                  <th className="text-right p-4 font-medium">Price</th>
                  <th className="text-right p-4 font-medium">$/lb {nutrientName}</th>
                  <th className="text-left p-4 font-medium">Vendor</th>
                </tr>
              </thead>
              <tbody>
                {productsWithNutrient.map(item => (
                  <tr 
                    key={item.product.id} 
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors" 
                    onClick={() => onSelectProduct(item.product.id)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {item.product.form === 'liquid' ? (
                          <Droplets className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Weight className="w-4 h-4 text-amber-500" />
                        )}
                        <span className="font-medium">{item.product.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">{item.nutrientPercent.toFixed(1)}%</td>
                    <td className="p-4 text-right text-muted-foreground">
                      {formatCurrency(item.price)}/{item.priceUnit}
                    </td>
                    <td className="p-4 text-right font-semibold text-emerald-600">
                      ${item.costPerLb.toFixed(2)}
                    </td>
                    <td className="p-4 text-muted-foreground">{item.vendor?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {productsWithNutrient.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No products found with {nutrientLabel} in their analysis.
              </div>
            )}
          </CardContent>
        </Card>
        
        <p className="mt-4 text-sm text-muted-foreground">
          Note: $/lb calculation uses raw nutrient content percentage. Actual plant availability may vary by product formulation.
        </p>
      </div>
    );
  }

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

      {/* Search, Filters, and View Toggle */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        
        {/* View Density Toggle */}
        <div className="flex items-center gap-0.5 border border-input rounded-lg p-0.5 bg-background">
          <button
            onClick={() => setViewDensity('compact')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewDensity === 'compact' 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="w-4 h-4" />
            Compact
          </button>
          <button
            onClick={() => setViewDensity('detailed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewDensity === 'detailed' 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutList className="w-4 h-4" />
            Detailed
          </button>
        </div>
        
        {/* Compare by Nutrient dropdown */}
        <Select 
          value={compareNutrient || ''} 
          onValueChange={(val) => setCompareNutrient(val || null)}
        >
          <SelectTrigger className="w-48">
            <FlaskConical className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Compare by Nutrient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Normal View</SelectItem>
            {NUTRIENT_OPTIONS.map(opt => (
              <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
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

      {/* Products List - Compact Mode */}
      {viewDensity === 'compact' && (
        <div className="space-y-4">
          {/* Used This Season - Pinned at top when no filters/search */}
          {!hasActiveFiltersOrSearch && usedThisSeasonProducts.length > 0 && (
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-emerald-50 dark:bg-emerald-950/20">
                <h3 className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Used This Season
                </h3>
              </div>
              <div>
                {usedThisSeasonProducts.map(product => (
                  <CompactProductRow key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}

          {/* Other Products / All Products */}
          {(hasActiveFiltersOrSearch ? filteredProducts : otherProducts).length > 0 && (
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              {!hasActiveFiltersOrSearch && usedThisSeasonProducts.length > 0 && (
                <div className="px-4 py-2 border-b border-border bg-muted/50">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Other Products
                  </h3>
                </div>
              )}
              <div>
                {(hasActiveFiltersOrSearch ? filteredProducts : otherProducts).map(product => (
                  <CompactProductRow key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm || activeFiltersCount > 0 
                ? 'No products match your filters.' 
                : 'No products yet. Click "Add Product" to get started.'
              }
            </div>
          )}
        </div>
      )}

      {/* Products List - Detailed Mode (existing grouped view) */}
      {viewDensity === 'detailed' && (
        <div className="space-y-6">
          {Object.entries(groupedProducts).map(([category, products]) => (
            <div key={category} className="bg-card rounded-xl shadow-sm border border-border">
              <div className="px-6 py-4 border-b border-border bg-muted/50 rounded-t-xl">
                <h3 className="font-semibold text-foreground">{category}</h3>
                <p className="text-sm text-muted-foreground">{products.length} products</p>
              </div>
              <div className="divide-y divide-border">
                {products.map(product => (
                  <DetailedProductRow key={product.id} product={product} />
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
      )}

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
