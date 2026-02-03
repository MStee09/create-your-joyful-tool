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
  ChevronRight,
  FlaskRound,
  CheckCircle2,
  AlertCircle,
  CircleDashed,
} from 'lucide-react';
import type { ProductMaster, VendorOffering, Vendor, InventoryItem, ProductCategory, Season, NutrientAnalysis } from '@/types';
import { 
  formatCurrency, 
  generateId, 
  getStockStatus, 
  CATEGORY_LABELS,
  inferProductCategory,
} from '@/lib/calculations';
import { isPesticideCategory, getChemicalDataStatus } from '@/types/chemicalData';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
  onAddVendorOffering?: (offering: VendorOffering) => void;
}

type ViewDensity = 'compact' | 'detailed';
type AddStep = 1 | 2;

export const ProductsListView: React.FC<ProductsListViewProps> = ({
  productMasters,
  vendorOfferings,
  vendors,
  inventory,
  currentSeason,
  onSelectProduct,
  onAddProduct,
  onAddVendorOffering,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ProductCategory | ''>('');
  const [filterForm, setFilterForm] = useState<'liquid' | 'dry' | ''>('');
  const [filterVendor, setFilterVendor] = useState<string>('');
  const [filterStock, setFilterStock] = useState<'low' | 'out' | ''>('');
  const [filterNoVendor, setFilterNoVendor] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewDensity, setViewDensity] = useState<ViewDensity>(() => {
    return (localStorage.getItem('productsViewDensity') as ViewDensity) || 'compact';
  });
  const [compareNutrient, setCompareNutrient] = useState<string | null>(null);
  const [categoryTab, setCategoryTab] = useState<ProductCategory | 'all'>('all');

  // Two-step add product state
  const [addStep, setAddStep] = useState<AddStep>(1);
  const [pendingProduct, setPendingProduct] = useState<Partial<ProductMaster>>({
    form: 'liquid',
    category: 'other',
    defaultUnit: 'gal',
  });
  const [newVendorId, setNewVendorId] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newPriceUnit, setNewPriceUnit] = useState<'gal' | 'lbs' | 'ton'>('gal');
  const [newPackaging, setNewPackaging] = useState('');
  const [customPackaging, setCustomPackaging] = useState('');
  const [newDensity, setNewDensity] = useState<number>(0);
  const [newCategory, setNewCategory] = useState<ProductCategory>('other');

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
        const hasVendor = offerings.length > 0;
        const chemicalDataStatus = isPesticideCategory(product.category || '') 
          ? getChemicalDataStatus(product.chemicalData)
          : null;

        return {
          ...product,
          preferredOffering,
          vendor,
          stockStatus: stockInfo.status,
          totalOnHand: stockInfo.totalOnHand,
          usedThisSeason: usedThisSeasonIds.has(product.id),
          hasVendor,
          chemicalDataStatus,
        };
      })
      .filter(product => {
        // Category tab filter (quick filter)
        if (categoryTab !== 'all' && product.category !== categoryTab) {
          return false;
        }
        // Search filter
        if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        // Category filter (from advanced filters)
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
        // No vendor filter
        if (filterNoVendor && product.hasVendor) {
          return false;
        }
        return true;
      });
  }, [productMasters, vendorOfferings, vendors, inventory, usedThisSeasonIds, searchTerm, filterCategory, filterForm, filterVendor, filterStock, filterNoVendor, categoryTab]);

  // Category tab counts for quick filter
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: productMasters.length };
    productMasters.forEach(p => {
      const cat = p.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [productMasters]);

  // Define category tabs (subset for quick access)
  const CATEGORY_TABS: Array<{ key: ProductCategory | 'all'; label: string; icon?: React.ReactNode }> = [
    { key: 'all', label: 'All' },
    { key: 'fertilizer-dry', label: 'Dry Fert' },
    { key: 'fertilizer-liquid', label: 'Liquid Fert' },
    { key: 'herbicide', label: 'Herbicide' },
    { key: 'fungicide', label: 'Fungicide' },
    { key: 'insecticide', label: 'Insecticide' },
    { key: 'adjuvant', label: 'Adjuvant' },
    { key: 'biological', label: 'Biological' },
  ];

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

  const PACKAGING_OPTIONS = ['Tote', 'Drum', 'Twin-pack', 'Jug', 'Bag', 'Bulk', 'Case'];

  const resetAddModal = () => {
    setAddStep(1);
    setPendingProduct({ form: 'liquid', category: 'other', defaultUnit: 'gal' });
    setNewVendorId('');
    setNewPrice(0);
    setNewPriceUnit('gal');
    setNewPackaging('');
    setCustomPackaging('');
    setNewDensity(0);
    setNewCategory('other');
  };

  const handleCloseAddModal = () => {
    resetAddModal();
    setShowAddModal(false);
  };

  const handleNextStep = () => {
    if (!pendingProduct.name?.trim()) return;
    // Store category and density for step 2
    setPendingProduct({
      ...pendingProduct,
      category: newCategory,
      densityLbsPerGal: pendingProduct.form === 'liquid' && newDensity > 0 ? newDensity : undefined,
    });
    setNewPriceUnit(pendingProduct.form === 'liquid' ? 'gal' : 'lbs');
    setAddStep(2);
  };

  const handleAddProduct = () => {
    if (!pendingProduct.name?.trim() || !newVendorId || newPrice <= 0) return;
    
    const productId = generateId();
    const product: ProductMaster = {
      id: productId,
      name: pendingProduct.name.trim(),
      category: pendingProduct.category || inferProductCategory(pendingProduct.name, pendingProduct.form || 'liquid'),
      form: pendingProduct.form || 'liquid',
      defaultUnit: pendingProduct.form === 'liquid' ? 'gal' : 'lbs',
      densityLbsPerGal: pendingProduct.densityLbsPerGal,
    };
    
    onAddProduct(product);
    
    // Create vendor offering if callback provided
    if (onAddVendorOffering) {
      const finalPackaging = newPackaging === 'custom' ? customPackaging : newPackaging;
      const offering: VendorOffering = {
        id: generateId(),
        productId,
        vendorId: newVendorId,
        price: newPrice,
        priceUnit: newPriceUnit,
        packaging: finalPackaging || undefined,
        isPreferred: true, // First vendor is always preferred
      };
      onAddVendorOffering(offering);
    }
    
    handleCloseAddModal();
  };

  const activeFiltersCount = [filterCategory, filterForm, filterVendor, filterStock, filterNoVendor].filter(Boolean).length;
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
          
          {/* Vendor or No Vendor warning */}
          {product.hasVendor ? (
            <>
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
            </>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 text-sm">
              <AlertTriangle className="w-3 h-3" />
              No vendor
            </span>
          )}
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Chemical Data Status - for pesticides only */}
          {product.chemicalDataStatus && (
            <span className={`flex items-center gap-1 text-xs whitespace-nowrap ${
              product.chemicalDataStatus === 'complete' 
                ? 'text-emerald-600' 
                : product.chemicalDataStatus === 'partial'
                  ? 'text-amber-600'
                  : 'text-muted-foreground'
            }`}>
              {product.chemicalDataStatus === 'complete' && <CheckCircle2 className="w-3 h-3" />}
              {product.chemicalDataStatus === 'partial' && <AlertCircle className="w-3 h-3" />}
              {product.chemicalDataStatus === 'none' && <CircleDashed className="w-3 h-3" />}
            </span>
          )}
          
          {/* Manufacturer badge for chemicals */}
          {isPesticideCategory(product.category || '') && product.manufacturer && (
            <span className="text-xs text-muted-foreground truncate max-w-24">
              {product.manufacturer}
            </span>
          )}
          
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
            {product.manufacturer && (
              <p className="text-xs text-muted-foreground italic">by {product.manufacturer}</p>
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
          
          {/* Chemical data status for pesticides */}
          {product.chemicalDataStatus && (
            <div className={`text-xs flex items-center gap-1 ${
              product.chemicalDataStatus === 'complete' 
                ? 'text-emerald-600' 
                : product.chemicalDataStatus === 'partial'
                  ? 'text-amber-600'
                  : 'text-muted-foreground'
            }`}>
              {product.chemicalDataStatus === 'complete' && <><CheckCircle2 className="w-3 h-3" /> Data complete</>}
              {product.chemicalDataStatus === 'partial' && <><AlertCircle className="w-3 h-3" /> Partial data</>}
              {product.chemicalDataStatus === 'none' && <><CircleDashed className="w-3 h-3" /> No chemical data</>}
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
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
            {product.vendor && (
              <span>{product.vendor.name}</span>
            )}
            {product.manufacturer && isPesticideCategory(product.category || '') && (
              <>
                {product.vendor && <span>·</span>}
                <span className="italic normal-case">by {product.manufacturer}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{product.name}</span>
            {product.generalNotes && <StickyNote className="w-4 h-4 text-amber-500" />}
            {product.labelFileName && <FileText className="w-4 h-4 text-blue-500" />}
            {/* Chemical data status icon */}
            {product.chemicalDataStatus === 'complete' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
            {product.chemicalDataStatus === 'partial' && (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
            {product.chemicalDataStatus === 'none' && (
              <CircleDashed className="w-4 h-4 text-muted-foreground" />
            )}
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
          value={compareNutrient || 'normal'} 
          onValueChange={(val) => setCompareNutrient(val === 'normal' ? null : val)}
        >
          <SelectTrigger className="w-48">
            <FlaskConical className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Compare by Nutrient" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal View</SelectItem>
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

      {/* Category Filter Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {CATEGORY_TABS.map(tab => {
          const count = categoryCounts[tab.key] || 0;
          const isActive = categoryTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setCategoryTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <span className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg items-center">
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
          
          {/* No Vendor Filter */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox 
              checked={filterNoVendor}
              onCheckedChange={(checked) => setFilterNoVendor(checked === true)}
            />
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Missing vendor only
            </span>
          </label>
          
          {activeFiltersCount > 0 && (
            <button
              onClick={() => { setFilterCategory(''); setFilterForm(''); setFilterVendor(''); setFilterStock(''); setFilterNoVendor(false); }}
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

      {/* Add Product Modal - Two Step */}
      {showAddModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Add Product</h3>
                <p className="text-xs text-muted-foreground">Step {addStep} of 2</p>
              </div>
              <div className="flex gap-1">
                <div className={`w-2 h-2 rounded-full ${addStep >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`w-2 h-2 rounded-full ${addStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              </div>
            </div>
            
            {addStep === 1 ? (
              /* Step 1: Product Details */
              <div className="p-6 space-y-4">
                <div>
                  <Label className="mb-1">Product Name *</Label>
                  <Input
                    value={pendingProduct.name || ''}
                    onChange={(e) => setPendingProduct({ ...pendingProduct, name: e.target.value })}
                    placeholder="e.g., BioAg E"
                    autoFocus
                  />
                </div>
                
                <div>
                  <Label className="mb-2">Category *</Label>
                  <Select value={newCategory} onValueChange={(v) => setNewCategory(v as ProductCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="mb-2">Form *</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="productForm"
                        checked={pendingProduct.form === 'liquid'}
                        onChange={() => setPendingProduct({ 
                          ...pendingProduct, 
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
                        checked={pendingProduct.form === 'dry'}
                        onChange={() => setPendingProduct({ 
                          ...pendingProduct, 
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
                
                {pendingProduct.form === 'liquid' && (
                  <div>
                    <Label className="mb-1">Density (lbs/gal)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 10.5"
                      value={newDensity || ''}
                      onChange={(e) => setNewDensity(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Vendor & Pricing */
              <div className="p-6 space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium">{pendingProduct.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {pendingProduct.form === 'liquid' ? (
                      <Droplets className="w-3 h-3 text-blue-500" />
                    ) : (
                      <Weight className="w-3 h-3 text-amber-500" />
                    )}
                    {CATEGORY_LABELS[newCategory] || 'Other'}
                  </p>
                </div>
                
                <div>
                  <Label className="mb-1">Vendor *</Label>
                  <Select value={newVendorId} onValueChange={setNewVendorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vendor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1">Price *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newPrice || ''}
                        onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1">Per</Label>
                    <Select value={newPriceUnit} onValueChange={(v) => setNewPriceUnit(v as 'gal' | 'lbs' | 'ton')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gal">gallon</SelectItem>
                        <SelectItem value="lbs">lb</SelectItem>
                        <SelectItem value="ton">ton</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label className="mb-1">Packaging</Label>
                  <Select value={newPackaging} onValueChange={setNewPackaging}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select packaging..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKAGING_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                      <SelectItem value="custom">Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                  {newPackaging === 'custom' && (
                    <Input
                      placeholder="e.g., 275 gal tote"
                      value={customPackaging}
                      onChange={(e) => setCustomPackaging(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  ℹ️ This vendor will be set as the preferred supplier. You can add more vendors later.
                </p>
              </div>
            )}
            
            <div className="px-6 py-4 border-t border-border flex justify-between">
              <div>
                {addStep === 2 && (
                  <Button variant="ghost" onClick={() => setAddStep(1)}>
                    ← Back
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCloseAddModal}>
                  Cancel
                </Button>
                {addStep === 1 ? (
                  <Button 
                    onClick={handleNextStep}
                    disabled={!pendingProduct.name?.trim()}
                  >
                    Next: Add Vendor →
                  </Button>
                ) : (
                  <Button 
                    onClick={handleAddProduct}
                    disabled={!newVendorId || newPrice <= 0}
                  >
                    Save Product
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
