import React, { useState, useEffect, useMemo, forwardRef, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Download,
  Package,
  Leaf,
  DollarSign,
  Warehouse,
  Calendar,
  Settings,
  BarChart3,
  FileSpreadsheet,
  Building2,
  FlaskConical,
  Droplets,
  Weight,
  Check,
  User,
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw,
  FileText,
  Upload,
  StickyNote,
  ClipboardList,
  ClipboardCheck,
  ShoppingCart,
  Truck,
  Bell,
  MapPin,
  GitCompare,
  Beaker,
} from 'lucide-react';

// Import types
import type {
  Product,
  ProductMaster,
  VendorOffering,
  Vendor,
  Season,
  Crop,
  Application,
  ApplicationTiming,
  Tier,
  InventoryItem,
  SeedTreatment,
  AppState,
  LiquidUnit,
  DryUnit,
  RateUnit,
  CommoditySpec,
} from './types';

// Import new components
import { ProductsListView } from './components/farm/ProductsListView';
import { ProductDetailView } from './components/farm/ProductDetailView';
import { VendorsViewNew } from './components/farm/VendorsViewNew';
import { CropPlannerView } from './components/farm/CropPlannerView';
import { DashboardView } from './components/farm/DashboardView';
import { DemandRollupView } from './components/farm/DemandRollupView';
import { CommoditySpecsView } from './components/farm/CommoditySpecsView';
import { BidEventsView } from './components/farm/BidEventsView';
import { BidEventDetailView } from './components/farm/BidEventDetailView';
import { PriceBookView } from './components/farm/PriceBookView';
import { SettingsView } from './components/farm/SettingsView';
import { OrdersView } from './components/farm/OrdersView';
import { PlanReadinessView } from './components/farm/PlanReadinessView';
import { VendorSpendView } from './components/farm/VendorSpendView';
import { BuyWorkflowView } from './components/farm/BuyWorkflowView';
import { VarianceView } from './components/farm/VarianceView';
import { VarianceByPassView } from './components/farm/VarianceByPassView';
import { ChangeLogView } from './components/farm/ChangeLogView';
import { ImportCenterView } from './components/farm/ImportCenterView';
import { TemplatesView } from './components/farm/TemplatesView';
import { AlertsView } from './components/farm/AlertsView';
import { MarketPricesView } from './components/farm/MarketPricesView';
import { AssistantView } from './components/farm/AssistantView';
import { PurchasesView } from './components/farm/PurchasesView';
import { PriceHistoryView } from './components/farm/PriceHistoryView';
import { FieldsListView } from './components/farm/fields/FieldsListView';
import { FieldDetailView } from './components/farm/fields/FieldDetailView';
import { FieldComparisonView } from './components/farm/fields/FieldComparisonView';
import { EquipmentListView } from './components/farm/equipment/EquipmentListView';
import { MixCalculatorView } from './components/farm/tankMix/MixCalculatorView';
import { RecordApplicationModal } from './components/farm/applications/RecordApplicationModal';
import { ApplicationVarianceView } from './components/farm/ApplicationVarianceView';
import { ChemicalProductDetailView } from './components/farm/chemical/ChemicalProductDetailView';
import { isPesticideCategory } from './types/chemicalData';
import { NutrientEfficiencyView } from './components/farm/NutrientEfficiencyView';
import { ApplicationHistoryView } from './components/farm/applications/ApplicationHistoryView';
import { migrateAppState, getProductsAsLegacy } from './lib/dataMigration';

// Import utilities
import {
  generateId,
  formatCurrency,
  formatNumber,
  convertToGallons,
  convertToPounds,
  calculateCropCosts,
  calculateCropNutrientSummary,
  createDefaultCrop,
  createDefaultTiers,
} from './lib/calculations';

// Import components
import { AuthProvider, useAuth } from './lib/AuthContext';
import { AuthPage } from './components/AuthPage';
import { SeedTreatmentCalculator } from './components/SeedTreatmentCalculator';
import { NutrientSummaryPanel, NutrientSummaryCompact } from './components/NutrientSummary';
import { EnhancedExportView } from './components/EnhancedExportView';

// Import Supabase data hook
import { useSupabaseData } from './hooks/useSupabaseData';

// Import migration utilities
import { hasLocalStorageData, getLocalStorageDataSummary, migrateToSupabase } from './lib/migrateToSupabase';
// Import SimplePurchase types
import type { SimplePurchase } from './types/simplePurchase';

// Import initial data from external file
import { initialState as defaultInitialState, initialProducts, initialVendors } from './initialData';

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

const Sidebar: React.FC<{
  activeView: string;
  onViewChange: (view: string) => void;
  seasons: Season[];
  currentSeasonId: string | null;
  onSeasonChange: (id: string) => void;
  isCloudSync: boolean;
  isSyncing: boolean;
  onSync?: () => void;
  userEmail?: string;
  onSignOut?: () => void;
}> = ({
  activeView,
  onViewChange,
  seasons,
  currentSeasonId,
  onSeasonChange,
  isCloudSync,
  isSyncing,
  onSync,
  userEmail,
  onSignOut,
}) => {
  const NavButton = ({ id, label, icon: Icon }: { id: string; label: string; icon: React.ElementType }) => {
    const active = activeView === id;
    return (
      <button
        onClick={() => onViewChange(id)}
        className={
          'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ' +
          (active ? 'bg-emerald-600 text-white' : 'text-stone-300 hover:bg-stone-800 hover:text-white')
        }
      >
        <Icon className="w-4 h-4" />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="w-64 bg-stone-900 text-stone-100 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-stone-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">FarmCalc</h1>
            <p className="text-xs text-stone-400">Input Planning</p>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      <div className="px-4 py-3 border-b border-stone-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCloudSync ? (
              <Cloud className="w-4 h-4 text-emerald-400" />
            ) : (
              <CloudOff className="w-4 h-4 text-stone-500" />
            )}
            <span className="text-xs text-stone-400">
              {isCloudSync ? 'Cloud Sync' : 'Local Only'}
            </span>
          </div>
          {isCloudSync && onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="p-1 hover:bg-stone-700 rounded"
            >
              <RefreshCw className={`w-4 h-4 text-stone-400 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Season Selector */}
      <div className="p-4 border-b border-stone-700">
        <label className="text-xs text-stone-400 uppercase tracking-wider mb-2 block">Season</label>
        <select
          value={currentSeasonId || ''}
          onChange={(e) => onSeasonChange(e.target.value)}
          className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {seasons.map(s => (
            <option key={s.id} value={s.id}>{s.year} - {s.name}</option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* PLAN section */}
        <div className="px-2 pb-2 text-xs text-stone-500 uppercase tracking-wider">Plan</div>
        <NavButton id="dashboard" label="Dashboard" icon={BarChart3} />
        <NavButton id="crops" label="Crop Plans" icon={Leaf} />
        <NavButton id="fields" label="Fields" icon={MapPin} />
        <NavButton id="field-comparison" label="Field Comparison" icon={GitCompare} />

        {/* PROCUREMENT section */}
        <div className="pt-4 mt-4 border-t border-stone-700">
          <div className="px-2 pb-2 text-xs text-stone-500 uppercase tracking-wider">Procurement</div>
          <NavButton id="plan-readiness" label="Order Status" icon={ClipboardCheck} />
          <NavButton id="purchases" label="Purchases" icon={ShoppingCart} />
          <NavButton id="vendor-spend" label="Vendor Spend" icon={DollarSign} />
        </div>

        {/* PRODUCTS section */}
        <div className="pt-4 mt-4 border-t border-stone-700">
          <div className="px-2 pb-2 text-xs text-stone-500 uppercase tracking-wider">Products</div>
          <NavButton id="products" label="Product Catalog" icon={FlaskConical} />
          <NavButton id="vendors" label="Vendors" icon={Building2} />
          <NavButton id="price-history" label="Price History" icon={DollarSign} />
        </div>

        {/* INVENTORY section */}
        <div className="pt-4 mt-4 border-t border-stone-700">
          <div className="px-2 pb-2 text-xs text-stone-500 uppercase tracking-wider">Inventory</div>
          <NavButton id="inventory" label="On Hand" icon={Warehouse} />
        </div>

        {/* REVIEW section */}
        <div className="pt-4 mt-4 border-t border-stone-700">
          <div className="px-2 pb-2 text-xs text-stone-500 uppercase tracking-wider">Review</div>
          <NavButton id="application-variance" label="Actual vs. Plan" icon={GitCompare} />
          <NavButton id="nutrient-efficiency" label="Nutrient Efficiency" icon={Leaf} />
          <NavButton id="application-history" label="Application History" icon={Calendar} />
        </div>

        {/* TOOLS section */}
        <div className="pt-4 mt-4 border-t border-stone-700">
          <div className="px-2 pb-2 text-xs text-stone-500 uppercase tracking-wider">Tools</div>
          <NavButton id="mix-calculator" label="Mix Calculator" icon={Beaker} />
          <NavButton id="equipment" label="Equipment" icon={Truck} />
        </div>

        {/* Bottom section */}
        <div className="pt-4 mt-4 border-t border-stone-700">
          <NavButton id="assistant" label="Assistant" icon={StickyNote} />
          <NavButton id="settings" label="Settings" icon={Settings} />
        </div>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-stone-700">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-stone-800">
          <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {userEmail ? userEmail.split('@')[0] : 'Local User'}
            </p>
            <p className="text-xs text-stone-400 truncate">
              {isCloudSync ? 'Cloud Sync' : 'Local Only'}
            </p>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="p-1 text-stone-400 hover:text-white hover:bg-stone-700 rounded"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// DashboardView is now imported from ./components/farm/DashboardView
// CropPlannerView is now imported from ./components/farm/CropPlannerView

// ============================================================================
// PRODUCTS VIEW (New Architecture)
// ============================================================================

const ProductsViewNew: React.FC<{
  productMasters: ProductMaster[];
  vendorOfferings: VendorOffering[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  commoditySpecs: CommoditySpec[];
  currentSeason: Season | null;
  priceRecords?: any[];
  onUpdateProductMasters: (productMasters: ProductMaster[]) => void;
  onAddProduct: (product: ProductMaster) => void;
  onUpdateProductMaster: (product: ProductMaster) => void;
  onUpdateOfferings: (offerings: VendorOffering[]) => void;
  onAddVendorOffering?: (offering: VendorOffering) => void;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
  onUpdateSpecs: (specs: CommoditySpec[]) => void;
  onNavigateToVendor?: (vendorId: string) => void;
  onAddPriceRecord?: (record: any) => Promise<any>;
}> = ({ 
  productMasters, 
  vendorOfferings, 
  vendors, 
  inventory,
  commoditySpecs,
  currentSeason,
  priceRecords = [],
  onUpdateProductMasters,
  onAddProduct,
  onUpdateProductMaster,
  onUpdateOfferings,
  onAddVendorOffering,
  onUpdateInventory,
  onUpdateSpecs,
  onNavigateToVendor,
  onAddPriceRecord,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => {
    const saved = sessionStorage.getItem('farmcalc-selected-product');
    return saved || null;
  });

  const selectProduct = (id: string | null) => {
    setSelectedProductId(id);
    if (id) sessionStorage.setItem('farmcalc-selected-product', id);
    else sessionStorage.removeItem('farmcalc-selected-product');
  };

  const selectedProduct = selectedProductId 
    ? productMasters.find(p => p.id === selectedProductId) 
    : null;

  // Only reset selectedProductId if product was removed (not during add race condition)
  // We check if there's no product AND no pending add by verifying it's not a brand new ID
  useEffect(() => {
    if (selectedProductId && !selectedProduct) {
      // Delay the reset to allow for state propagation from product add
      const timeout = setTimeout(() => {
        const stillNotFound = !productMasters.find(p => p.id === selectedProductId);
        if (stillNotFound) selectProduct(null);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [productMasters, selectedProductId, selectedProduct]);

  const handleAddProduct = (product: ProductMaster) => {
    onAddProduct(product);
    // Immediately select the new product
    selectProduct(product.id);
  };

  const handleUpdateProduct = (product: ProductMaster) => {
    onUpdateProductMaster(product);
  };

  const handleDeleteProduct = (productId: string) => {
    onUpdateProductMasters(productMasters.filter(p => p.id !== productId));
    onUpdateOfferings(vendorOfferings.filter(o => o.productId !== productId));
    onUpdateInventory(inventory.filter(i => i.productId !== productId));
    selectProduct(null);
  };

  if (selectedProduct) {
    // Use ChemicalProductDetailView for pesticides and adjuvants
    if (isPesticideCategory(selectedProduct.category) || selectedProduct.category === 'adjuvant') {
      return (
        <ChemicalProductDetailView
          product={selectedProduct}
          vendorOfferings={vendorOfferings}
          vendors={vendors}
          inventory={inventory}
          commoditySpecs={commoditySpecs}
          onUpdateProduct={handleUpdateProduct}
          onUpdateOfferings={onUpdateOfferings}
          onDeleteProduct={handleDeleteProduct}
          onBack={() => selectProduct(null)}
          onNavigateToVendor={onNavigateToVendor}
        />
      );
    }
    
    // Use standard ProductDetailView for fertilizers and other categories
    return (
      <ProductDetailView
        product={selectedProduct}
        vendorOfferings={vendorOfferings}
        vendors={vendors}
        inventory={inventory}
        commoditySpecs={commoditySpecs}
        priceRecords={priceRecords}
        currentSeasonYear={currentSeason?.year || new Date().getFullYear()}
        onUpdateProduct={handleUpdateProduct}
        onUpdateOfferings={onUpdateOfferings}
        onUpdateInventory={onUpdateInventory}
        onUpdateSpecs={onUpdateSpecs}
        onDeleteProduct={handleDeleteProduct}
        onBack={() => selectProduct(null)}
        onNavigateToVendor={onNavigateToVendor}
        onAddPriceRecord={onAddPriceRecord}
      />
    );
  }

  return (
    <ProductsListView
      productMasters={productMasters}
      vendorOfferings={vendorOfferings}
      vendors={vendors}
      inventory={inventory}
      currentSeason={currentSeason}
      onSelectProduct={selectProduct}
      onAddProduct={handleAddProduct}
      onAddVendorOffering={onAddVendorOffering}
    />
  );
};
// ============================================================================
// VENDORS VIEW (Simplified)
// ============================================================================

const VendorsView: React.FC<{
  vendors: Vendor[];
  products: Product[];
  onUpdateVendors: (vendors: Vendor[]) => void;
}> = ({ vendors, products, onUpdateVendors }) => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-stone-800">Vendors</h2>
        <p className="text-stone-500 mt-1">Manage your product suppliers</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {vendors.map(vendor => {
          const vendorProducts = products.filter(p => p.vendorId === vendor.id);
          return (
            <div key={vendor.id} className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-800">{vendor.name}</h3>
                  <p className="text-sm text-stone-500">{vendorProducts.length} products</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// INVENTORY VIEW
// ============================================================================

import { ProductSelectorModal, type ProductWithContext } from './components/farm/ProductSelectorModal';
import { AddInventoryModal, type PriceHistory } from './components/farm/AddInventoryModal';
import { formatInventoryDisplay, getDefaultPackagingOptions } from './lib/packagingUtils';

const InventoryView: React.FC<{
  inventory: InventoryItem[];
  products: Product[];
  vendors: Vendor[];
  season: Season | null;
  purchases: SimplePurchase[];
  onUpdateInventory: (inventory: InventoryItem[]) => void;
}> = ({ inventory, products, vendors, season, purchases, onUpdateInventory }) => {
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productContext, setProductContext] = useState<ProductWithContext | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPackagingType, setEditPackagingType] = useState<string>('Bulk');
  const [editPackagingSize, setEditPackagingSize] = useState<number>(0);
  const [editContainerCount, setEditContainerCount] = useState<number>(1);
  const [inventoryTab, setInventoryTab] = useState<'all' | 'on-hand' | 'ordered'>('all');
  

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

  const handleAddInventoryData = (data: {
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
    
    setShowAddModal(false);
    setSelectedProduct(null);
    setProductContext(null);
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
    handleAddInventoryData({
      quantity: data.quantity,
      unit: data.unit,
      packageType: data.packageType,
      packageQuantity: data.packageQuantity,
    });
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setSelectedProduct(null);
    setProductContext(null);
  };

  const handleSaveEdit = (id: string, product: Product) => {
    const isBulk = editPackagingType === 'Bulk';
    const totalQuantity = isBulk ? editContainerCount : editPackagingSize * editContainerCount;
    
    if (totalQuantity <= 0) {
      onUpdateInventory(inventory.filter(i => i.id !== id));
    } else {
      onUpdateInventory(inventory.map(i => i.id === id ? { 
        ...i, 
        quantity: totalQuantity,
        unit: product.form === 'liquid' ? 'gal' : 'lbs',
        packagingName: isBulk ? undefined : editPackagingType,
        packagingSize: isBulk ? undefined : editPackagingSize,
        containerCount: isBulk ? undefined : editContainerCount
      } : i));
    }
    setEditingId(null);
  };
  
  // Get default size for a packaging type
  const getDefaultSizeForType = (type: string, form: 'liquid' | 'dry'): number => {
    const defaults = getDefaultPackagingOptions(form);
    const match = defaults.find(d => d.name === type);
    return match?.unitSize || (form === 'liquid' ? 30 : 50);
  };

  const handleDelete = (id: string) => {
    onUpdateInventory(inventory.filter(i => i.id !== id));
  };

  // Helper to format inventory display
  const formatOnHand = (invItem?: InventoryItem, quantity?: number, unit?: 'gal' | 'lbs') => {
    if (!invItem) {
      return { primary: `${formatNumber(quantity || 0, 1)} ${unit || 'gal'}`, secondary: '' };
    }
    return formatInventoryDisplay(
      invItem.containerCount,
      invItem.packagingName,
      invItem.packagingSize,
      invItem.quantity,
      invItem.unit
    );
  };

  // Combine all inventory for simple on-hand view
  const allInventoryItems = useMemo(() => {
    return inventory.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return null;
      const vendor = vendors.find(v => v.id === product.vendorId);
      let value = item.quantity * product.price;
      if (product.priceUnit === 'ton') {
        value = (item.quantity / 2000) * product.price;
      }
      const display = formatOnHand(item);
      return { item, product, vendor, value, display, type: 'on-hand' as const };
    }).filter(Boolean) as Array<{
      item: InventoryItem;
      product: Product;
      vendor: Vendor | undefined;
      value: number;
      display: { primary: string; secondary: string };
      type: 'on-hand';
    }>;
  }, [inventory, products, vendors]);

  // Calculate ordered items from pending purchases
  const orderedItems = useMemo(() => {
    const pendingPurchases = purchases.filter(p => p.status === 'ordered');
    const items: Array<{
      purchaseId: string;
      lineId: string;
      product: Product;
      vendor: Vendor | undefined;
      quantity: number;
      unit: 'gal' | 'lbs';
      packageType?: string;
      value: number;
      orderDate: string;
      expectedDeliveryDate?: string;
      type: 'ordered';
    }> = [];
    
    for (const purchase of pendingPurchases) {
      const vendor = vendors.find(v => v.id === purchase.vendorId);
      for (const line of purchase.lines) {
        const product = products.find(p => p.id === line.productId);
        if (!product) continue;
        items.push({
          purchaseId: purchase.id,
          lineId: line.id,
          product,
          vendor,
          quantity: line.totalQuantity,
          unit: (line.packageUnit || (product.form === 'liquid' ? 'gal' : 'lbs')) as 'gal' | 'lbs',
          packageType: line.packageType,
          value: line.totalPrice,
          orderDate: purchase.orderDate,
          expectedDeliveryDate: purchase.expectedDeliveryDate,
          type: 'ordered',
        });
      }
    }
    return items;
  }, [purchases, products, vendors]);

  // Calculate totals for summary cards
  const onHandTotal = useMemo(() => allInventoryItems.reduce((sum, i) => sum + i.value, 0), [allInventoryItems]);
  const orderedTotal = useMemo(() => orderedItems.reduce((sum, i) => sum + i.value, 0), [orderedItems]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Inventory</h2>
          <p className="text-muted-foreground mt-1">
            Track your on-hand and ordered products
          </p>
        </div>
        <button
          onClick={() => setShowProductSelector(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
        >
          <Plus className="w-5 h-5" />
          Add Inventory
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">On Hand</div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(onHandTotal)}</div>
          <div className="text-xs text-muted-foreground mt-1">{allInventoryItems.length} products</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Truck className="w-4 h-4 text-blue-500" />
            Ordered
          </div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(orderedTotal)}</div>
          <div className="text-xs text-muted-foreground mt-1">{orderedItems.length} line items</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">Total Position</div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(onHandTotal + orderedTotal)}</div>
          <div className="text-xs text-muted-foreground mt-1">On Hand + Ordered</div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex bg-muted rounded-lg p-1 mb-6 w-fit">
        {[
          { id: 'all', label: 'All', count: allInventoryItems.length + orderedItems.length },
          { id: 'on-hand', label: 'On Hand', count: allInventoryItems.length },
          { id: 'ordered', label: 'Ordered', count: orderedItems.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setInventoryTab(tab.id as typeof inventoryTab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              inventoryTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              inventoryTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/20'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Product Selector Modal */}
      <ProductSelectorModal
        open={showProductSelector}
        onOpenChange={setShowProductSelector}
        products={products}
        vendors={vendors}
        inventory={inventory}
        currentSeason={season}
        onSelectProduct={handleSelectProduct}
      />

      {/* Inventory Add Modal */}
      {showAddModal && selectedProduct && productContext && (
        <AddInventoryModal
          product={selectedProduct}
          vendor={vendors.find(v => v.id === selectedProduct.vendorId) || null}
          vendors={vendors}
          onHand={productContext.onHand}
          planNeeds={productContext.plannedUsage}
          unit={selectedProduct.form === 'liquid' ? 'gal' : 'lbs'}
          usedIn={productContext.usedIn.map(u => ({
            cropName: u.split(' → ')[0] || u,
            timingName: u.split(' → ')[1] || '',
          }))}
          packageOptions={getDefaultPackagingOptions(selectedProduct.form).map(p => ({
            label: p.name,
            size: p.unitSize,
            unit: p.unitType,
          }))}
          priceHistory={[]}
          currentSeasonYear={season?.year || new Date().getFullYear()}
          onClose={handleCloseAddModal}
          onAddInventory={handleAddInventoryData}
          onCreatePurchase={handleCreatePurchase}
        />
      )}

      {/* On Hand Inventory Table */}
      {(inventoryTab === 'all' || inventoryTab === 'on-hand') && allInventoryItems.length > 0 && (
        <div className="mb-6">
          {inventoryTab === 'all' && (
            <div className="flex items-center gap-2 mb-3">
              <Warehouse className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">On Hand</h3>
            </div>
          )}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Product</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Quantity</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Value</th>
                  <th className="px-6 py-4 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allInventoryItems.map(({ item, product, vendor, value, display }) => (
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
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            {vendor?.name || ''}
                          </p>
                          <span className="font-medium text-foreground">{product.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 justify-end">
                            <select
                              value={editPackagingType}
                              onChange={(e) => {
                                const newType = e.target.value;
                                setEditPackagingType(newType);
                                if (newType !== 'Bulk') {
                                  setEditPackagingSize(getDefaultSizeForType(newType, product.form));
                                }
                              }}
                              className="px-2 py-1 text-sm border border-border rounded bg-background"
                            >
                              <option value="Bulk">Bulk</option>
                              <option value="Tote">Tote</option>
                              <option value="Drum">Drum</option>
                              <option value="Jug">Jug</option>
                              <option value="Pail">Pail</option>
                              <option value="Bag">Bag</option>
                            </select>
                            {editPackagingType !== 'Bulk' && (
                              <>
                                <input
                                  type="number"
                                  value={editPackagingSize}
                                  onChange={(e) => setEditPackagingSize(Number(e.target.value))}
                                  className="w-16 px-2 py-1 text-right border border-border rounded bg-background"
                                />
                                <span className="text-xs text-muted-foreground">{product.form === 'liquid' ? 'gal' : 'lbs'}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            {editPackagingType !== 'Bulk' ? (
                              <>
                                <span className="text-muted-foreground">×</span>
                                <input
                                  type="number"
                                  value={editContainerCount}
                                  onChange={(e) => setEditContainerCount(Number(e.target.value))}
                                  className="w-14 px-2 py-1 text-right border border-border rounded bg-background"
                                  min={1}
                                />
                                <span className="text-xs text-muted-foreground">
                                  = {editPackagingSize * editContainerCount} {product.form === 'liquid' ? 'gal' : 'lbs'}
                                </span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="number"
                                  value={editContainerCount}
                                  onChange={(e) => setEditContainerCount(Number(e.target.value))}
                                  className="w-20 px-2 py-1 text-right border border-border rounded bg-background"
                                />
                                <span className="text-xs text-muted-foreground">{product.form === 'liquid' ? 'gal' : 'lbs'}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleSaveEdit(item.id, product)}
                              className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-foreground">{display.primary}</span>
                          {display.secondary && (
                            <p className="text-xs text-muted-foreground">{display.secondary}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      {formatCurrency(value)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {editingId !== item.id && (
                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              if (item.packagingName && item.packagingSize && item.containerCount) {
                                setEditPackagingType(item.packagingName);
                                setEditPackagingSize(item.packagingSize);
                                setEditContainerCount(item.containerCount);
                              } else {
                                setEditPackagingType('Bulk');
                                setEditPackagingSize(0);
                                setEditContainerCount(item.quantity);
                              }
                            }}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ordered Items Table */}
      {(inventoryTab === 'all' || inventoryTab === 'ordered') && orderedItems.length > 0 && (
        <div className="mb-6">
          {inventoryTab === 'all' && (
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ordered (Pending Delivery)</h3>
            </div>
          )}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Product</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Quantity</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Expected</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orderedItems.map((item) => (
                  <tr key={`${item.purchaseId}-${item.lineId}`} className="hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50`}>
                          <Truck className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            {item.vendor?.name || ''}
                          </p>
                          <span className="font-medium text-foreground">{item.product.name}</span>
                          {item.packageType && (
                            <p className="text-xs text-muted-foreground">{item.packageType}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-foreground font-medium">
                        {formatNumber(item.quantity, 1)} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.expectedDeliveryDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {new Date(item.expectedDeliveryDate).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ordered {new Date(item.orderDate).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right text-muted-foreground">
                      {formatCurrency(item.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty States */}
      {inventoryTab === 'on-hand' && allInventoryItems.length === 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center mb-6">
          <Warehouse className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">No On-Hand Inventory</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Add products to track what you have on hand.
          </p>
        </div>
      )}
      
      {inventoryTab === 'ordered' && orderedItems.length === 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center mb-6">
          <Truck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">No Pending Orders</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Record a purchase to track incoming deliveries.
          </p>
        </div>
      )}

      {inventoryTab === 'all' && allInventoryItems.length === 0 && orderedItems.length === 0 && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center mb-6">
          <Warehouse className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">No Inventory</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Add on-hand inventory or record a purchase to get started.
          </p>
        </div>
      )}

    </div>
  );
};

// ============================================================================

// ============================================================================
// ============================================================================
// MAIN APP CONTENT (uses Supabase when authenticated)
// ============================================================================

const AppContent: React.FC = () => {
  const { user, signOut } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<string[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  // Phase 5: Record Application modal state
  const [showRecordApplicationModal, setShowRecordApplicationModal] = useState(false);
  
  // Use Supabase data when authenticated
  const supabaseData = useSupabaseData(user);
  
  // Destructure Supabase data and handlers
  const {
    seasons,
    vendors,
    productMasters,
    vendorOfferings,
    inventory,
    commoditySpecs,
    bidEvents,
    vendorQuotes,
    awards,
    priceBook,
    orders,
    invoices,
    priceRecords,
    currentSeasonId,
    loading: supabaseLoading,
    error: supabaseError,
    setCurrentSeasonId,
    updateSeasons,
    updateVendors,
    updateProductMasters,
    addProductMaster,
    updateProductMaster,
    updateVendorOfferings,
    updateInventory,
    updateCommoditySpecs,
    updateBidEvents,
    updateVendorQuotes,
    updateAwards,
    updatePriceBook,
    updateOrders,
    addOrder,
    updateInvoices,
    addInvoice,
    addPriceRecord,
    // New SimplePurchase operations
    simplePurchases,
    addSimplePurchase,
    updateSimplePurchase,
    deleteSimplePurchase,
    // Fields + Equipment operations
    fields,
    fieldAssignments,
    fieldCropOverrides,
    equipment,
    addField,
    updateField,
    deleteField,
    updateFields,
    updateFieldAssignments,
    updateFieldCropOverrides,
    addEquipment,
    updateEquipmentItem,
    deleteEquipment,
    // Tank mix recipes
    tankMixRecipes,
    addTankMixRecipe,
    deleteTankMixRecipe,
    // Application records (Phase 5)
    applicationRecords,
    addApplicationWithInventoryDeduction,
    refetch,
  } = supabaseData;

  // Check for localStorage data to migrate
  const localDataSummary = getLocalStorageDataSummary();
  const hasDataToMigrate = hasLocalStorageData() && !migrationComplete;
  const supabaseIsEmpty = !supabaseLoading && seasons.length === 0 && productMasters.length === 0 && vendors.length === 0;

  // Auto-show migration panel if Supabase is empty but localStorage has data
  useEffect(() => {
    if (supabaseIsEmpty && hasDataToMigrate && !showMigration) {
      setShowMigration(true);
    }
  }, [supabaseIsEmpty, hasDataToMigrate]);

  const handleMigrate = async () => {
    if (!user) return;
    
    setIsMigrating(true);
    setMigrationProgress([]);
    setMigrationError(null);
    
    const result = await migrateToSupabase(user, (msg: string) => {
      setMigrationProgress(prev => [...prev, msg]);
    });
    
    if (result.success) {
      setMigrationComplete(true);
      setShowMigration(false);
      // Refresh data from Supabase
      await refetch();
    } else {
      setMigrationError(result.error || 'Migration failed');
    }
    
    setIsMigrating(false);
  };

  // Show loading state while Supabase data is loading
  if (supabaseLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  // Show migration panel if there's data to migrate
  if (showMigration && hasDataToMigrate) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Cloud className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-stone-800">Migrate to Cloud</h2>
              <p className="text-sm text-stone-500">Transfer your local data to secure cloud storage</p>
            </div>
          </div>
          
          {localDataSummary && (
            <div className="bg-stone-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-stone-700 mb-3">Data to migrate:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Seasons:</span>
                  <span className="font-medium">{localDataSummary.seasons}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Vendors:</span>
                  <span className="font-medium">{localDataSummary.vendors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Products:</span>
                  <span className="font-medium">{localDataSummary.products}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Offerings:</span>
                  <span className="font-medium">{localDataSummary.vendorOfferings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Inventory:</span>
                  <span className="font-medium">{localDataSummary.inventory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Specs:</span>
                  <span className="font-medium">{localDataSummary.commoditySpecs}</span>
                </div>
              </div>
            </div>
          )}
          
          {migrationProgress.length > 0 && (
            <div className="bg-stone-900 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto font-mono text-xs">
              {migrationProgress.map((msg, i) => (
                <div key={i} className="text-emerald-400">{msg}</div>
              ))}
            </div>
          )}
          
          {migrationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">{migrationError}</p>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowMigration(false)}
              disabled={isMigrating}
              className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 disabled:opacity-50"
            >
              Skip for Now
            </button>
            <button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Migrate Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (supabaseError) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 mb-4">
            <X className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-stone-800 mb-2">Error Loading Data</h2>
          <p className="text-stone-600 mb-4">{supabaseError}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Build state object for compatibility with existing code
  const state = {
    seasons,
    vendors,
    productMasters,
    vendorOfferings,
    inventory,
    commoditySpecs,
    bidEvents,
    vendorQuotes,
    awards,
    priceBook,
    orders,
    invoices,
    currentSeasonId,
  };

  // Get legacy products for backward-compatible components
  // NOTE: Keep this as a plain computation (not a hook) to avoid hook-order issues
  // if this component returns early during auth/loading states.
  const legacyProducts = getProductsAsLegacy(productMasters || [], vendorOfferings || []);

  const currentSeason = seasons.find(s => s.id === currentSeasonId) || null;

  const handleSeasonChange = (seasonId: string) => {
    setCurrentSeasonId(seasonId);
  };

  const handleUpdateSeason = async (updatedSeason: Season) => {
    const newSeasons = seasons.map(s => s.id === updatedSeason.id ? updatedSeason : s);
    await updateSeasons(newSeasons);
  };

  const handleAddSeason = async (season: Season) => {
    await updateSeasons([...seasons, season]);
    setCurrentSeasonId(season.id);
  };

  const handleDeleteSeason = async (seasonId: string) => {
    const newSeasons = seasons.filter(s => s.id !== seasonId);
    await updateSeasons(newSeasons);
    if (currentSeasonId === seasonId) {
      setCurrentSeasonId(newSeasons[0]?.id || null);
    }
  };

  const handleUpdateProductMasters = async (newProductMasters: ProductMaster[]) => {
    await updateProductMasters(newProductMasters);
  };

  const handleAddProduct = async (product: ProductMaster) => {
    await addProductMaster(product);
  };

  const handleUpdateProductMaster = async (product: ProductMaster) => {
    await updateProductMaster(product);
  };

  const handleUpdateVendorOfferings = async (newOfferings: VendorOffering[]) => {
    await updateVendorOfferings(newOfferings);
  };

  const handleUpdateVendors = async (newVendors: Vendor[]) => {
    await updateVendors(newVendors);
  };

  const handleUpdateInventory = async (newInventory: InventoryItem[]) => {
    await updateInventory(newInventory);
  };

  const handleResetData = async () => {
    // Clear all data by updating with empty arrays
    await Promise.all([
      updateSeasons([]),
      updateVendors([]),
      updateProductMasters([]),
      updateVendorOfferings([]),
      updateInventory([]),
      updateCommoditySpecs([]),
      updateBidEvents([]),
      updateVendorQuotes([]),
      updateAwards([]),
      updatePriceBook([]),
    ]);
    setCurrentSeasonId(null);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await refetch();
    setIsSyncing(false);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            season={currentSeason}
            products={legacyProducts}
            productMasters={state.productMasters || []}
            priceBook={state.priceBook || []}
            seasonYear={currentSeason?.year || new Date().getFullYear()}
            inventory={state.inventory}
            purchases={simplePurchases || []}
            onViewChange={setActiveView}
            onOpenRecordApplication={() => setShowRecordApplicationModal(true)}
          />
        );
      case 'crops':
        return (
          <CropPlannerView
            season={currentSeason}
            products={legacyProducts}
            vendors={state.vendors}
            inventory={state.inventory}
            productMasters={state.productMasters || []}
            priceBook={state.priceBook || []}
            fields={fields || []}
            fieldAssignments={fieldAssignments || []}
            fieldCropOverrides={fieldCropOverrides || []}
            onUpdateSeason={handleUpdateSeason}
            onUpdateFieldAssignments={updateFieldAssignments}
            onUpdateFieldCropOverrides={updateFieldCropOverrides}
            onNavigateToMixCalculator={(fieldId, acres) => {
              // Navigate to mix calculator - could store context for pre-population
              setActiveView('mix-calculator');
            }}
          />
        );
      case 'fields':
        return (
          <FieldsListView
            fields={fields || []}
            fieldAssignments={fieldAssignments || []}
            seasons={seasons}
            onSelectField={(fieldId) => setActiveView(`field-${fieldId}`)}
            onAddField={addField}
            onUpdateFields={updateFields}
          />
        );
      case 'equipment':
        return (
          <EquipmentListView
            equipment={equipment || []}
            onAddEquipment={addEquipment}
            onUpdateEquipment={updateEquipmentItem}
            onDeleteEquipment={deleteEquipment}
          />
        );
      case 'mix-calculator':
        return (
          <MixCalculatorView
            equipment={equipment || []}
            products={state.productMasters || []}
            recipes={tankMixRecipes || []}
            onSaveRecipe={addTankMixRecipe}
            onDeleteRecipe={deleteTankMixRecipe}
          />
        );
      case 'field-comparison':
        return (
          <FieldComparisonView
            fields={fields || []}
            fieldAssignments={fieldAssignments || []}
            seasons={seasons}
            currentSeason={currentSeason}
            products={legacyProducts}
            productMasters={state.productMasters || []}
            priceBook={state.priceBook || []}
            onSelectField={(fieldId) => setActiveView(`field-${fieldId}`)}
            onBack={() => setActiveView('fields')}
          />
        );
      case 'products':
        return (
          <ProductsViewNew
            productMasters={state.productMasters || []}
            vendorOfferings={state.vendorOfferings || []}
            vendors={state.vendors}
            inventory={state.inventory}
            commoditySpecs={state.commoditySpecs || []}
            currentSeason={currentSeason}
            priceRecords={priceRecords || []}
            onUpdateProductMasters={handleUpdateProductMasters}
            onAddProduct={handleAddProduct}
            onUpdateProductMaster={handleUpdateProductMaster}
            onUpdateOfferings={handleUpdateVendorOfferings}
            onAddVendorOffering={(offering) => handleUpdateVendorOfferings([...(state.vendorOfferings || []), offering])}
            onUpdateInventory={handleUpdateInventory}
            onUpdateSpecs={updateCommoditySpecs}
            onNavigateToVendor={() => setActiveView('vendors')}
            onAddPriceRecord={addPriceRecord}
          />
        );
      case 'vendors':
        return (
          <VendorsViewNew
            vendors={state.vendors}
            productMasters={state.productMasters || []}
            vendorOfferings={state.vendorOfferings || []}
            inventory={state.inventory}
            currentSeason={currentSeason}
            onUpdateVendors={handleUpdateVendors}
            onNavigateToProduct={() => setActiveView('products')}
          />
        );
      case 'inventory':
        return (
          <InventoryView
            inventory={state.inventory}
            products={legacyProducts}
            vendors={state.vendors}
            season={currentSeason}
            purchases={simplePurchases || []}
            onUpdateInventory={handleUpdateInventory}
          />
        );
      // Legacy route redirects - redirect to new simplified views
      case 'buy-workflow':
      case 'orders':
        // Redirect procurement-related views to Purchases
        return (
          <PurchasesView
            purchases={simplePurchases || []}
            vendors={vendors}
            products={productMasters || []}
            vendorOfferings={vendorOfferings || []}
            priceRecords={priceRecords || []}
            currentSeasonId={state.currentSeasonId || ''}
            currentSeasonYear={currentSeason?.year || new Date().getFullYear()}
            onAddPurchase={addSimplePurchase}
            onUpdatePurchase={updateSimplePurchase}
            onDeletePurchase={deleteSimplePurchase}
            onAddPriceRecord={addPriceRecord}
          />
        );
      case 'procurement':
        return (
          <DemandRollupView
            season={currentSeason}
            productMasters={state.productMasters || []}
            commoditySpecs={state.commoditySpecs || []}
            onNavigateToSpecs={() => setActiveView('commodity-specs')}
            fieldAssignments={fieldAssignments || []}
            fieldOverrides={fieldCropOverrides || []}
          />
        );
      case 'vendor-spend':
        return (
          <VendorSpendView
            season={currentSeason}
            products={legacyProducts}
            vendorOfferings={state.vendorOfferings || []}
            vendors={state.vendors}
          />
        );
      // 'orders' case handled above in legacy redirect block
      case 'plan-readiness':
        return (
          <PlanReadinessView
            inventory={state.inventory}
            products={legacyProducts}
            vendors={state.vendors}
            season={currentSeason}
            purchases={simplePurchases || []}
            onUpdateInventory={handleUpdateInventory}
          />
        );
      case 'variance':
      case 'variance-by-pass':
      case 'alerts':
        // Redirect analysis views to Dashboard
        return (
          <DashboardView
            season={currentSeason}
            products={legacyProducts}
            productMasters={productMasters}
            priceBook={state.priceBook || []}
            seasonYear={currentSeason?.year}
            inventory={state.inventory}
            purchases={simplePurchases || []}
            onViewChange={setActiveView}
          />
        );
      case 'commodity-specs':
        return (
          <CommoditySpecsView
            commoditySpecs={state.commoditySpecs || []}
            productMasters={state.productMasters || []}
            onUpdateSpecs={updateCommoditySpecs}
            onUpdateProducts={handleUpdateProductMasters}
            onBack={() => setActiveView('procurement')}
          />
        );
      case 'bid-events':
        return (
          <BidEventsView
            bidEvents={state.bidEvents || []}
            vendors={state.vendors}
            commoditySpecs={state.commoditySpecs || []}
            productMasters={state.productMasters || []}
            currentSeasonYear={currentSeason?.year || new Date().getFullYear()}
            onUpdateEvents={updateBidEvents}
            onSelectEvent={(eventId) => setActiveView(`bid-event-${eventId}`)}
            onBack={() => setActiveView('procurement')}
          />
        );
      case 'price-book':
      case 'market-prices':
        // Redirect price views to Price History
        return (
          <PriceHistoryView
            priceRecords={priceRecords || []}
            products={productMasters || []}
            vendors={vendors}
            currentSeasonYear={currentSeason?.year || new Date().getFullYear()}
            onAddPriceRecord={addPriceRecord}
          />
        );
      case 'exports':
        return (
          <EnhancedExportView
            season={currentSeason}
            products={legacyProducts}
            vendors={state.vendors}
            inventory={state.inventory}
          />
        );
      case 'settings':
        return (
          <SettingsView
            seasons={state.seasons}
            onAddSeason={handleAddSeason}
            onDeleteSeason={handleDeleteSeason}
            onResetData={handleResetData}
          />
        );
      // 'variance' case handled above in legacy redirect block
      // 'variance-by-pass' case handled above in legacy redirect block
      case 'changes':
        return (
          <ChangeLogView
            orders={state.orders || []}
            invoices={state.invoices || []}
            priceBook={state.priceBook || []}
            bidEvents={state.bidEvents || []}
          />
        );
      case 'import':
        return (
          <ImportCenterView
            currentSeason={currentSeason}
            vendors={state.vendors}
            productMasters={state.productMasters || []}
            vendorOfferings={state.vendorOfferings || []}
            inventory={state.inventory}
            commoditySpecs={state.commoditySpecs || []}
            priceBook={state.priceBook || []}
            onUpdateVendors={handleUpdateVendors}
            onUpdateProductMasters={handleUpdateProductMasters}
            onUpdateVendorOfferings={handleUpdateVendorOfferings}
            onUpdateInventory={handleUpdateInventory}
            onUpdateCommoditySpecs={updateCommoditySpecs}
            onUpdatePriceBook={updatePriceBook}
          />
        );
      case 'templates':
        return (
          <TemplatesView
            season={currentSeason}
            onUpdateSeason={handleUpdateSeason}
          />
        );
      // 'alerts' case handled above in legacy redirect block
      // 'market-prices' case handled above in price-book redirect block
      case 'purchases':
        return (
          <PurchasesView
            purchases={simplePurchases || []}
            vendors={vendors}
            products={productMasters || []}
            vendorOfferings={vendorOfferings || []}
            priceRecords={priceRecords || []}
            currentSeasonId={state.currentSeasonId || ''}
            currentSeasonYear={currentSeason?.year || new Date().getFullYear()}
            onAddPurchase={addSimplePurchase}
            onUpdatePurchase={updateSimplePurchase}
            onDeletePurchase={deleteSimplePurchase}
            onAddPriceRecord={addPriceRecord}
          />
        );
      case 'price-history':
        return (
          <PriceHistoryView
            priceRecords={priceRecords || []}
            products={productMasters || []}
            vendors={vendors}
            currentSeasonYear={currentSeason?.year || new Date().getFullYear()}
            onAddPriceRecord={addPriceRecord}
          />
        );
      case 'assistant':
        return (
          <AssistantView
            season={currentSeason}
            products={legacyProducts}
            inventory={state.inventory}
            orders={state.orders || []}
            invoices={state.invoices || []}
            priceBook={state.priceBook || []}
            onNavigate={setActiveView}
          />
        );
      case 'application-variance':
        return (
          <ApplicationVarianceView
            season={currentSeason}
            products={legacyProducts}
            applicationRecords={applicationRecords || []}
          />
        );
      case 'nutrient-efficiency':
        return (
          <NutrientEfficiencyView
            season={currentSeason}
            products={legacyProducts}
            applicationRecords={applicationRecords || []}
          />
        );
      case 'application-history':
        return (
          <ApplicationHistoryView
            season={currentSeason}
            applicationRecords={applicationRecords || []}
            fields={fields || []}
            productMasters={productMasters || []}
            crops={(currentSeason?.crops || []).map(c => ({ id: c.id, name: c.name }))}
          />
        );
      default:
        // Check for field detail view
        if (activeView.startsWith('field-')) {
          const fieldId = activeView.replace('field-', '');
          const field = (fields || []).find(f => f.id === fieldId);
          if (field) {
            return (
              <FieldDetailView
                field={field}
                fieldAssignments={(fieldAssignments || []).filter(fa => fa.fieldId === fieldId)}
                seasons={seasons}
                onUpdateField={updateField}
                onBack={() => setActiveView('fields')}
              />
            );
          }
        }
        // Check for bid event detail view
        if (activeView.startsWith('bid-event-')) {
          const eventId = activeView.replace('bid-event-', '');
          const event = (state.bidEvents || []).find(e => e.id === eventId);
          if (event) {
            return (
              <BidEventDetailView
                event={event}
                vendors={state.vendors}
                commoditySpecs={state.commoditySpecs || []}
                productMasters={state.productMasters || []}
                vendorQuotes={state.vendorQuotes || []}
                awards={state.awards || []}
                priceBook={state.priceBook || []}
                season={currentSeason}
                orders={state.orders || []}
                onAddOrder={addOrder}
                onNavigate={setActiveView}
                onUpdateEvent={async (updatedEvent) => {
                  const newEvents = bidEvents.map(e => 
                    e.id === updatedEvent.id ? updatedEvent : e
                  );
                  await updateBidEvents(newEvents);
                }}
                onUpdateQuotes={updateVendorQuotes}
                onUpdateAwards={updateAwards}
                onUpdatePriceBook={updatePriceBook}
                onBack={() => setActiveView('bid-events')}
              />
            );
          }
        }
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-stone-100 font-sans">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        seasons={state.seasons}
        currentSeasonId={state.currentSeasonId}
        onSeasonChange={handleSeasonChange}
        isCloudSync={!!user}
        isSyncing={isSyncing}
        onSync={user ? handleSync : undefined}
        userEmail={user?.email}
        onSignOut={user ? signOut : undefined}
      />
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {renderView()}
        </div>
      </main>

      {/* Phase 5: Record Application Modal */}
      {currentSeason && (
        <RecordApplicationModal
          isOpen={showRecordApplicationModal}
          onClose={() => setShowRecordApplicationModal(false)}
          onSave={async (record) => {
            await addApplicationWithInventoryDeduction(record);
          }}
          season={currentSeason}
          fields={fields || []}
          fieldAssignments={fieldAssignments || []}
          productMasters={productMasters || []}
          inventory={inventory || []}
          equipment={equipment || []}
          applicationRecords={applicationRecords || []}
        />
      )}
    </div>
  );
};

// ============================================================================
// ROOT APP WITH AUTH PROVIDER
// ============================================================================

const App: React.FC = () => {
  const [skipAuth, setSkipAuth] = useState(() => {
    return localStorage.getItem('farmcalc-skip-auth') === 'true';
  });

  const handleSkipAuth = () => {
    localStorage.setItem('farmcalc-skip-auth', 'true');
    setSkipAuth(true);
  };

  return (
    <AuthProvider>
      <AppWithAuth skipAuth={skipAuth} onSkipAuth={handleSkipAuth} />
    </AuthProvider>
  );
};

const AppWithAuth: React.FC<{ skipAuth: boolean; onSkipAuth: () => void }> = ({ skipAuth, onSkipAuth }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  return <AppContent />;
};

export default App;
