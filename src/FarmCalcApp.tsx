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
import { HowToPage } from './components/farm/HowToPage';
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
  const navItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'crops', icon: Leaf, label: 'Crop Plans' },
    { id: 'products', icon: FlaskConical, label: 'Products' },
    { id: 'vendors', icon: Building2, label: 'Vendors' },
    { id: 'inventory', icon: Warehouse, label: 'Inventory' },
    { id: 'exports', icon: FileSpreadsheet, label: 'Export' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];
  
  const procurementItems = [
    { id: 'procurement', label: 'Demand Rollup' },
    { id: 'commodity-specs', label: 'Commodity Specs' },
    { id: 'bid-events', label: 'Bid Events' },
    { id: 'price-book', label: 'Price Book' },
  ];
  
  const isProcurementActive = activeView === 'procurement' || activeView === 'commodity-specs' || activeView === 'bid-events' || activeView === 'price-book' || activeView.startsWith('bid-event-');

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
            <p className="text-xs text-stone-400">In-Furrow Planner</p>
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
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeView === item.id
                ? 'bg-emerald-600 text-white'
                : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
        
        {/* Procurement Section with Sub-items */}
        <div className="pt-2">
          <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
            isProcurementActive ? 'bg-stone-800' : ''
          }`}>
            <Package className="w-5 h-5 text-stone-400" />
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Procurement</span>
          </div>
          <div className="ml-4 mt-1 space-y-1">
            {procurementItems.map(item => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${
                  activeView === item.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-white'
                }`}
              >
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
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
              {userEmail || 'No account'}
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
  onUpdateProductMasters: (productMasters: ProductMaster[]) => void;
  onUpdateOfferings: (offerings: VendorOffering[]) => void;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
  onUpdateSpecs: (specs: CommoditySpec[]) => void;
  onNavigateToVendor?: (vendorId: string) => void;
}> = ({ 
  productMasters, 
  vendorOfferings, 
  vendors, 
  inventory,
  commoditySpecs,
  currentSeason,
  onUpdateProductMasters, 
  onUpdateOfferings,
  onUpdateInventory,
  onUpdateSpecs,
  onNavigateToVendor,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const selectedProduct = selectedProductId 
    ? productMasters.find(p => p.id === selectedProductId) 
    : null;

  const handleAddProduct = (product: ProductMaster) => {
    onUpdateProductMasters([...productMasters, product]);
  };

  const handleUpdateProduct = (product: ProductMaster) => {
    onUpdateProductMasters(productMasters.map(p => p.id === product.id ? product : p));
  };

  const handleDeleteProduct = (productId: string) => {
    onUpdateProductMasters(productMasters.filter(p => p.id !== productId));
    // Also remove related offerings and inventory
    onUpdateOfferings(vendorOfferings.filter(o => o.productId !== productId));
    onUpdateInventory(inventory.filter(i => i.productId !== productId));
    setSelectedProductId(null);
  };

  if (selectedProduct) {
    return (
      <ProductDetailView
        product={selectedProduct}
        vendorOfferings={vendorOfferings}
        vendors={vendors}
        inventory={inventory}
        commoditySpecs={commoditySpecs}
        onUpdateProduct={handleUpdateProduct}
        onUpdateOfferings={onUpdateOfferings}
        onUpdateInventory={onUpdateInventory}
        onUpdateSpecs={onUpdateSpecs}
        onDeleteProduct={handleDeleteProduct}
        onBack={() => setSelectedProductId(null)}
        onNavigateToVendor={onNavigateToVendor}
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
      onSelectProduct={setSelectedProductId}
      onAddProduct={handleAddProduct}
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
// INVENTORY VIEW (Plan Readiness)
// ============================================================================

import { calculatePlannedUsage, PlannedUsageItem } from './lib/calculations';
import { ProductSelectorModal, type ProductWithContext } from './components/farm/ProductSelectorModal';
import { AddInventoryModal, type PriceHistory } from './components/farm/AddInventoryModal';
import { formatInventoryDisplay, getDefaultPackagingOptions } from './lib/packagingUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './components/ui/collapsible';

const InventoryView: React.FC<{
  inventory: InventoryItem[];
  products: Product[];
  vendors: Vendor[];
  season: Season | null;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
}> = ({ inventory, products, vendors, season, onUpdateInventory }) => {
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productContext, setProductContext] = useState<ProductWithContext | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPackagingType, setEditPackagingType] = useState<string>('Bulk');
  const [editPackagingSize, setEditPackagingSize] = useState<number>(0);
  const [editContainerCount, setEditContainerCount] = useState<number>(1);
  
  // Persist Plan Readiness collapsed state
  const [planReadinessOpen, setPlanReadinessOpen] = useState(() => {
    const saved = localStorage.getItem('inventory-plan-readiness-open');
    return saved === 'true'; // Default to closed
  });
  
  useEffect(() => {
    localStorage.setItem('inventory-plan-readiness-open', String(planReadinessOpen));
  }, [planReadinessOpen]);

  // Calculate planned usage
  const plannedUsage = useMemo(() => 
    calculatePlannedUsage(season, products), 
    [season, products]
  );

  // Build readiness data
  const readinessData = useMemo(() => {
    const blocking: Array<{
      product: Product;
      needed: number;
      onHand: number;
      short: number;
      unit: 'gal' | 'lbs';
      usages: PlannedUsageItem['usages'];
      inventoryItem?: InventoryItem;
    }> = [];
    
    const planned: Array<{
      product: Product;
      needed: number;
      onHand: number;
      remaining: number;
      unit: 'gal' | 'lbs';
      value: number;
      usages: PlannedUsageItem['usages'];
      inventoryId?: string;
      inventoryItem?: InventoryItem;
    }> = [];
    
    const unassigned: Array<{
      product: Product;
      onHand: number;
      unit: 'gal' | 'lbs';
      value: number;
      inventoryId: string;
      inventoryItem: InventoryItem;
    }> = [];
    
    // Products with planned usage
    const plannedProductIds = new Set(plannedUsage.map(p => p.productId));
    
    plannedUsage.forEach(usage => {
      const product = products.find(p => p.id === usage.productId);
      if (!product) return;
      
      const invItem = inventory.find(i => i.productId === usage.productId);
      const onHand = invItem?.quantity || 0;
      const remaining = onHand - usage.totalNeeded;
      
      let value = onHand * product.price;
      if (product.priceUnit === 'ton') {
        value = (onHand / 2000) * product.price;
      }
      
      if (remaining < 0) {
        blocking.push({
          product,
          needed: usage.totalNeeded,
          onHand,
          short: Math.abs(remaining),
          unit: usage.unit,
          usages: usage.usages,
          inventoryItem: invItem,
        });
      }
      
      planned.push({
        product,
        needed: usage.totalNeeded,
        onHand,
        remaining,
        unit: usage.unit,
        value,
        usages: usage.usages,
        inventoryId: invItem?.id,
        inventoryItem: invItem,
      });
    });
    
    // Inventory items not in plan
    inventory.forEach(item => {
      if (plannedProductIds.has(item.productId)) return;
      
      const product = products.find(p => p.id === item.productId);
      if (!product) return;
      
      let value = item.quantity * product.price;
      if (product.priceUnit === 'ton') {
        value = (item.quantity / 2000) * product.price;
      }
      
      unassigned.push({
        product,
        onHand: item.quantity,
        unit: item.unit,
        value,
        inventoryId: item.id,
        inventoryItem: item,
      });
    });
    
    return { blocking, planned, unassigned };
  }, [plannedUsage, inventory, products]);

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

  const handleQuickAddFromBlocking = (productId: string, shortAmount: number, unit: 'gal' | 'lbs') => {
    // Open the modal with context for this product
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const vendor = vendors.find(v => v.id === product.vendorId);
    const invItems = inventory.filter(i => i.productId === productId);
    const onHand = invItems.reduce((sum, i) => sum + i.quantity, 0);
    const usageItem = plannedUsage.find(u => u.productId === productId);
    const plannedNeeded = usageItem?.totalNeeded || 0;
    const usedIn = usageItem?.usages.map(u => `${u.cropName} → ${u.timingName}`) || [];
    
    const context: ProductWithContext = {
      product,
      vendor,
      plannedUsage: plannedNeeded,
      onHand,
      status: shortAmount > 0 ? 'short' : 'ok',
      shortfall: shortAmount,
      usedIn,
    };
    
    setSelectedProduct(product);
    setProductContext(context);
    setShowAddModal(true);
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

  const hasPlannedUsage = plannedUsage.length > 0;

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
      return { item, product, vendor, value, display };
    }).filter(Boolean) as Array<{
      item: InventoryItem;
      product: Product;
      vendor: Vendor | undefined;
      value: number;
      display: { primary: string; secondary: string };
    }>;
  }, [inventory, products, vendors]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">Inventory</h2>
          <p className="text-stone-500 mt-1">
            Track your on-hand product quantities
          </p>
        </div>
        <button
          onClick={() => setShowProductSelector(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
        >
          <Plus className="w-5 h-5" />
          Add Inventory
        </button>
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

      {/* Simple On-Hand Inventory Table */}
      {allInventoryItems.length > 0 && (
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">Product</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">On Hand</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">Value</th>
                  <th className="px-6 py-4 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {allInventoryItems.map(({ item, product, vendor, value, display }) => (
                  <tr key={item.id} className="hover:bg-stone-50">
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
                          <p className="text-[10px] text-stone-400 uppercase tracking-wide">
                            {vendor?.name || ''}
                          </p>
                          <span className="font-medium text-stone-800">{product.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === item.id ? (
                        <div className="space-y-2">
                          {/* Row 1: Packaging Type + Custom Size */}
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
                              className="px-2 py-1 text-sm border border-stone-300 rounded bg-white"
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
                                  className="w-16 px-2 py-1 text-right border border-stone-300 rounded"
                                />
                                <span className="text-xs text-stone-500">{product.form === 'liquid' ? 'gal' : 'lbs'}</span>
                              </>
                            )}
                          </div>
                          
                          {/* Row 2: Count + Total */}
                          <div className="flex items-center gap-2 justify-end">
                            {editPackagingType !== 'Bulk' ? (
                              <>
                                <span className="text-stone-500">×</span>
                                <input
                                  type="number"
                                  value={editContainerCount}
                                  onChange={(e) => setEditContainerCount(Number(e.target.value))}
                                  className="w-14 px-2 py-1 text-right border border-stone-300 rounded"
                                  min={1}
                                />
                                <span className="text-xs text-stone-400">
                                  = {editPackagingSize * editContainerCount} {product.form === 'liquid' ? 'gal' : 'lbs'}
                                </span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="number"
                                  value={editContainerCount}
                                  onChange={(e) => setEditContainerCount(Number(e.target.value))}
                                  className="w-20 px-2 py-1 text-right border border-stone-300 rounded"
                                />
                                <span className="text-xs text-stone-500">{product.form === 'liquid' ? 'gal' : 'lbs'}</span>
                              </>
                            )}
                          </div>
                          
                          {/* Row 3: Save/Cancel */}
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleSaveEdit(item.id, product)}
                              className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 text-xs text-stone-500 hover:text-stone-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-stone-700">{display.primary}</span>
                          {display.secondary && (
                            <p className="text-xs text-stone-400">{display.secondary}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-stone-600">
                      {formatCurrency(value)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {editingId !== item.id && (
                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              // Initialize from existing item
                              if (item.packagingName && item.packagingSize && item.containerCount) {
                                setEditPackagingType(item.packagingName);
                                setEditPackagingSize(item.packagingSize);
                                setEditContainerCount(item.containerCount);
                              } else {
                                // Bulk mode
                                setEditPackagingType('Bulk');
                                setEditPackagingSize(0);
                                setEditContainerCount(item.quantity);
                              }
                            }}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
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

      {/* Empty State - No inventory */}
      {allInventoryItems.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-12 text-center mb-6">
          <Warehouse className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h3 className="font-semibold text-stone-800 mb-2">No Inventory Items</h3>
          <p className="text-stone-500 max-w-md mx-auto">
            Add products to track what you have on hand.
          </p>
        </div>
      )}

      {/* Collapsible Plan Readiness Section */}
      {hasPlannedUsage && (
        <Collapsible open={planReadinessOpen} onOpenChange={setPlanReadinessOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors">
            <span className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <ChevronRight className={`w-4 h-4 transition-transform ${planReadinessOpen ? 'rotate-90' : ''}`} />
              Plan Readiness
            </span>
            {readinessData.blocking.length > 0 ? (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                {readinessData.blocking.length} items blocking
              </span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                Ready to execute
              </span>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-6">
            {/* Blocking Section (inside collapsible) */}
            {readinessData.blocking.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wider">
                    Blocking Plan Execution
                  </h3>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                  <div className="divide-y divide-red-100">
                    {readinessData.blocking.map(item => (
                      <div key={item.product.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            item.product.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'
                          }`}>
                            {item.product.form === 'liquid' 
                              ? <Droplets className="w-5 h-5 text-blue-600" /> 
                              : <Weight className="w-5 h-5 text-amber-600" />}
                          </div>
                          <div>
                            <p className="text-[10px] text-stone-400 uppercase tracking-wide">
                              {vendors.find(v => v.id === item.product.vendorId)?.name || ''}
                            </p>
                            <p className="font-medium text-stone-800">{item.product.name}</p>
                            <p className="text-sm text-stone-500">
                              {item.usages.map(u => u.cropName).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-stone-500">
                              Need {formatNumber(item.needed, 1)} {item.unit}, have {formatNumber(item.onHand, 1)}
                            </p>
                            <p className="font-semibold text-red-600">
                              Short {formatNumber(item.short, 1)} {item.unit}
                            </p>
                          </div>
                          <button
                            onClick={() => handleQuickAddFromBlocking(item.product.id, item.short, item.unit)}
                            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
                          >
                            Add {formatNumber(item.short, 1)}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Planned Usage Overview (inside collapsible) */}
            <div>
              <h3 className="text-sm font-semibold text-stone-600 uppercase tracking-wider mb-3">
                Planned Usage Overview
              </h3>
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-stone-50">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">Product</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">On Hand</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">Planned</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {readinessData.planned.map(item => (
                      <tr key={item.product.id} className="hover:bg-stone-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              item.product.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'
                            }`}>
                              {item.product.form === 'liquid' 
                                ? <Droplets className="w-5 h-5 text-blue-600" /> 
                                : <Weight className="w-5 h-5 text-amber-600" />}
                            </div>
                            <div>
                              <span className="font-medium text-stone-800">{item.product.name}</span>
                              <p className="text-xs text-stone-400">
                                {item.usages.map(u => `${u.cropName} → ${u.timingName}`).join(', ')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-stone-700">{formatNumber(item.onHand, 1)} {item.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-stone-600">
                          {formatNumber(item.needed, 1)} {item.unit}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-semibold ${item.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {item.remaining >= 0 ? '+' : ''}{formatNumber(item.remaining, 1)} {item.unit}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

// ============================================================================
// SETTINGS VIEW
// ============================================================================

const SettingsView: React.FC<{
  seasons: Season[];
  onAddSeason: (season: Season) => void;
  onDeleteSeason: (id: string) => void;
  onResetData: () => void;
}> = ({ seasons, onAddSeason, onDeleteSeason, onResetData }) => {
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [newSeasonYear, setNewSeasonYear] = useState(new Date().getFullYear() + 1);
  const [newSeasonName, setNewSeasonName] = useState('Growing Season');

  const handleAddSeason = () => {
    const season: Season = {
      id: generateId(),
      year: newSeasonYear,
      name: newSeasonName,
      crops: [],
      createdAt: new Date(),
    };
    onAddSeason(season);
    setShowAddSeason(false);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-stone-800">Settings</h2>
        <p className="text-stone-500 mt-1">Manage seasons and configuration</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">Seasons</h3>
          <button
            onClick={() => setShowAddSeason(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            New Season
          </button>
        </div>
        <div className="divide-y divide-stone-100">
          {seasons.map(season => (
            <div key={season.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-stone-800">{season.year} - {season.name}</p>
                  <p className="text-sm text-stone-500">{season.crops.length} crops</p>
                </div>
              </div>
              <button
                onClick={() => onDeleteSeason(season.id)}
                className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Reset Data Section */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 mt-6">
        <div className="px-6 py-4 border-b border-stone-200">
          <h3 className="font-semibold text-stone-800">Data Management</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-800">Reset to Default Data</p>
              <p className="text-sm text-stone-500">Restore all products, vendors, and crop plans to the original spreadsheet values.</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Reset all data to default spreadsheet values? This cannot be undone.')) {
                  onResetData();
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Reset Data
            </button>
          </div>
        </div>
      </div>

      {showAddSeason && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4 p-6">
            <h3 className="font-semibold text-lg mb-4">Create New Season</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Year</label>
                <input
                  type="number"
                  value={newSeasonYear}
                  onChange={(e) => setNewSeasonYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddSeason(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg">
                Cancel
              </button>
              <button onClick={handleAddSeason} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
    currentSeasonId,
    loading: supabaseLoading,
    error: supabaseError,
    setCurrentSeasonId,
    updateSeasons,
    updateVendors,
    updateProductMasters,
    updateVendorOfferings,
    updateInventory,
    updateCommoditySpecs,
    updateBidEvents,
    updateVendorQuotes,
    updateAwards,
    updatePriceBook,
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
    currentSeasonId,
  };

  // Get legacy products for backward-compatible components
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
            onUpdateSeason={handleUpdateSeason}
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
            onUpdateProductMasters={handleUpdateProductMasters}
            onUpdateOfferings={handleUpdateVendorOfferings}
            onUpdateInventory={handleUpdateInventory}
            onUpdateSpecs={updateCommoditySpecs}
            onNavigateToVendor={() => setActiveView('vendors')}
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
            onUpdateInventory={handleUpdateInventory}
          />
        );
      case 'procurement':
        return (
          <DemandRollupView
            season={currentSeason}
            productMasters={state.productMasters || []}
            commoditySpecs={state.commoditySpecs || []}
            onNavigateToSpecs={() => setActiveView('commodity-specs')}
          />
        );
      case 'commodity-specs':
        return (
          <CommoditySpecsView
            commoditySpecs={state.commoditySpecs || []}
            productMasters={state.productMasters || []}
            onUpdateSpecs={updateCommoditySpecs}
            onUpdateProducts={handleUpdateProductMasters}
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
          />
        );
      case 'price-book':
        return (
          <PriceBookView
            priceBook={state.priceBook || []}
            productMasters={state.productMasters || []}
            vendors={state.vendors}
            bidEvents={state.bidEvents || []}
            commoditySpecs={state.commoditySpecs || []}
            currentSeasonYear={currentSeason?.year || new Date().getFullYear()}
            onUpdatePriceBook={updatePriceBook}
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
      case 'howto':
        return <HowToPage />;
      default:
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
