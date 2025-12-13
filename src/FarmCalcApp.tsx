import React, { useState, useEffect, useMemo, forwardRef } from 'react';
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
} from './types';

// Import new components
import { ProductsListView } from './components/farm/ProductsListView';
import { ProductDetailView } from './components/farm/ProductDetailView';
import { VendorsViewNew } from './components/farm/VendorsViewNew';
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
import { TierManager } from './components/TierManager';
import { EnhancedExportView } from './components/EnhancedExportView';

// Import data sync hooks (only used when authenticated)
import {
  useSyncSeasons,
  useSyncProducts,
  useSyncVendors,
  useSyncInventory,
} from './lib/useDataSync';

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

// ============================================================================
// DASHBOARD VIEW
// ============================================================================

const DashboardView: React.FC<{
  season: Season | null;
  products: Product[];
  inventory: InventoryItem[];
  vendors: Vendor[];
}> = ({ season, products, inventory, vendors }) => {
  const stats = useMemo(() => {
    if (!season) return { totalAcres: 0, totalCost: 0, costPerAcre: 0, cropCount: 0 };
    
    let totalCost = 0;
    let totalAcres = 0;
    
    season.crops.forEach(crop => {
      totalAcres += crop.totalAcres;
      const costs = calculateCropCosts(crop, products);
      totalCost += costs.totalCost;
    });
    
    return {
      totalAcres,
      totalCost,
      costPerAcre: totalAcres > 0 ? totalCost / totalAcres : 0,
      cropCount: season.crops.length,
    };
  }, [season, products]);

  const cropSummaries = useMemo(() => {
    if (!season) return [];
    
    return season.crops.map(crop => {
      const costs = calculateCropCosts(crop, products);
      const nutrients = calculateCropNutrientSummary(crop, products);
      
      return {
        name: crop.name,
        acres: crop.totalAcres,
        totalCost: costs.totalCost,
        costPerAcre: costs.costPerAcre,
        applicationCount: crop.applications.length,
        seedTreatmentCount: crop.seedTreatments.length,
        nutrients,
      };
    });
  }, [season, products]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-stone-800">Dashboard</h2>
        <p className="text-stone-500 mt-1">
          {season ? `${season.year} - ${season.name}` : 'No season selected'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Leaf className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Total Acres</p>
              <p className="text-2xl font-bold text-stone-800">{formatNumber(stats.totalAcres, 0)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Total Plan Cost</p>
              <p className="text-2xl font-bold text-stone-800">{formatCurrency(stats.totalCost)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Avg Cost/Acre</p>
              <p className="text-2xl font-bold text-stone-800">{formatCurrency(stats.costPerAcre)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">Crops Planned</p>
              <p className="text-2xl font-bold text-stone-800">{stats.cropCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Crop Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 mb-8">
        <div className="px-6 py-4 border-b border-stone-200">
          <h3 className="font-semibold text-stone-800">Crop Cost Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Crop</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Acres</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Apps</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Seed Trt</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Cost</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Cost/Acre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {cropSummaries.map((crop, idx) => (
                <tr key={idx} className="hover:bg-stone-50">
                  <td className="px-6 py-4 font-medium text-stone-800">{crop.name}</td>
                  <td className="px-6 py-4 text-right text-stone-600">{formatNumber(crop.acres, 0)}</td>
                  <td className="px-6 py-4 text-right text-stone-600">{crop.applicationCount}</td>
                  <td className="px-6 py-4 text-right text-stone-600">{crop.seedTreatmentCount}</td>
                  <td className="px-6 py-4 text-right text-stone-600">{formatCurrency(crop.totalCost)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600">{formatCurrency(crop.costPerAcre)}</td>
                </tr>
              ))}
              {cropSummaries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-stone-400">
                    No crops configured. Add crops in the Crop Plans section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nutrient Summary Cards */}
      {cropSummaries.length > 0 && (
        <div>
          <h3 className="font-semibold text-stone-800 mb-4">Nutrient Summary (lbs/acre)</h3>
          <div className="grid grid-cols-3 gap-4">
            {cropSummaries.map((crop, idx) => (
              <NutrientSummaryCompact
                key={idx}
                nutrientSummary={crop.nutrients}
                cropName={crop.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CROP PLANNER VIEW
// ============================================================================

const CropPlannerView: React.FC<{
  season: Season | null;
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  onUpdateSeason: (season: Season) => void;
}> = ({ season, products, vendors, inventory, onUpdateSeason }) => {
  const [activeCropId, setActiveCropId] = useState<string | null>(null);
  const [showAddCrop, setShowAddCrop] = useState(false);
  const [newCropName, setNewCropName] = useState('');
  const [newCropAcres, setNewCropAcres] = useState(100);

  const activeCrop = season?.crops.find(c => c.id === activeCropId) || season?.crops[0] || null;

  useEffect(() => {
    if (season?.crops.length && !activeCropId) {
      setActiveCropId(season.crops[0].id);
    }
  }, [season, activeCropId]);

  const handleAddCrop = () => {
    if (!season || !newCropName.trim()) return;
    
    const newCrop = createDefaultCrop(newCropName.trim(), newCropAcres);
    const updatedSeason = {
      ...season,
      crops: [...season.crops, newCrop],
    };
    onUpdateSeason(updatedSeason);
    setActiveCropId(newCrop.id);
    setShowAddCrop(false);
    setNewCropName('');
    setNewCropAcres(100);
  };

  const handleUpdateCrop = (updatedCrop: Crop) => {
    if (!season) return;
    const updatedSeason = {
      ...season,
      crops: season.crops.map(c => c.id === updatedCrop.id ? updatedCrop : c),
    };
    onUpdateSeason(updatedSeason);
  };

  const handleDeleteCrop = (cropId: string) => {
    if (!season) return;
    if (!window.confirm('Delete this crop and all its applications?')) return;
    
    const updatedSeason = {
      ...season,
      crops: season.crops.filter(c => c.id !== cropId),
    };
    onUpdateSeason(updatedSeason);
    if (activeCropId === cropId) {
      setActiveCropId(updatedSeason.crops[0]?.id || null);
    }
  };

  if (!season) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-stone-400">No season selected</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Crop Tabs Sidebar */}
      <div className="w-56 bg-stone-100 border-r border-stone-200 flex flex-col">
        <div className="p-4 border-b border-stone-200">
          <h3 className="font-semibold text-stone-700">Crops</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {season.crops.map(crop => {
            const costs = calculateCropCosts(crop, products);
            return (
              <button
                key={crop.id}
                onClick={() => setActiveCropId(crop.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  activeCropId === crop.id
                    ? 'bg-emerald-600 text-white'
                    : 'hover:bg-stone-200 text-stone-700'
                }`}
              >
                <p className="font-medium">{crop.name}</p>
                <p className={`text-sm ${activeCropId === crop.id ? 'text-emerald-100' : 'text-stone-500'}`}>
                  {formatNumber(crop.totalAcres, 0)} ac • {formatCurrency(costs.costPerAcre)}/ac
                </p>
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-stone-200">
          {showAddCrop ? (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Crop name"
                value={newCropName}
                onChange={(e) => setNewCropName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="number"
                placeholder="Acres"
                value={newCropAcres}
                onChange={(e) => setNewCropAcres(Number(e.target.value))}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddCrop}
                  className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddCrop(false)}
                  className="px-3 py-2 rounded-lg text-sm text-stone-600 hover:bg-stone-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddCrop(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-stone-300 rounded-lg text-stone-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Crop
            </button>
          )}
        </div>
      </div>

      {/* Crop Detail */}
      <div className="flex-1 overflow-y-auto">
        {activeCrop ? (
          <CropDetail
            crop={activeCrop}
            products={products}
            vendors={vendors}
            inventory={inventory}
            onUpdate={handleUpdateCrop}
            onDelete={() => handleDeleteCrop(activeCrop.id)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-stone-400">Select or add a crop to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// CROP DETAIL COMPONENT
// ============================================================================

const CropDetail: React.FC<{
  crop: Crop;
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  onUpdate: (crop: Crop) => void;
  onDelete: () => void;
}> = ({ crop, products, vendors, inventory, onUpdate, onDelete }) => {
  const [editingAcres, setEditingAcres] = useState(false);
  const [acresValue, setAcresValue] = useState(crop.totalAcres);
  const [showAddTiming, setShowAddTiming] = useState(false);
  const [newTimingName, setNewTimingName] = useState('');
  const [expandedTimings, setExpandedTimings] = useState<Set<string>>(
    new Set(crop.applicationTimings.map(t => t.id))
  );

  // Calculate totals
  const calculations = useMemo(() => {
    return calculateCropCosts(crop, products);
  }, [crop, products]);

  const handleSaveAcres = () => {
    onUpdate({ ...crop, totalAcres: acresValue });
    setEditingAcres(false);
  };

  const handleAddTiming = () => {
    if (!newTimingName.trim()) return;
    const newTiming: ApplicationTiming = {
      id: generateId(),
      name: newTimingName.trim(),
      order: crop.applicationTimings.length,
    };
    onUpdate({
      ...crop,
      applicationTimings: [...crop.applicationTimings, newTiming],
    });
    setExpandedTimings(prev => new Set([...prev, newTiming.id]));
    setShowAddTiming(false);
    setNewTimingName('');
  };

  const handleDeleteTiming = (timingId: string) => {
    onUpdate({
      ...crop,
      applicationTimings: crop.applicationTimings.filter(t => t.id !== timingId),
      applications: crop.applications.filter(a => a.timingId !== timingId),
    });
  };

  const handleAddApplication = (timingId: string) => {
    const newApp: Application = {
      id: generateId(),
      timingId,
      productId: products[0]?.id || '',
      rate: 0,
      rateUnit: 'oz',
      tierId: crop.tiers[0]?.id || '',
    };
    onUpdate({
      ...crop,
      applications: [...crop.applications, newApp],
    });
  };

  const handleUpdateApplication = (appId: string, updates: Partial<Application>) => {
    onUpdate({
      ...crop,
      applications: crop.applications.map(a => a.id === appId ? { ...a, ...updates } : a),
    });
  };

  const handleDeleteApplication = (appId: string) => {
    onUpdate({
      ...crop,
      applications: crop.applications.filter(a => a.id !== appId),
    });
  };

  const toggleTimingExpanded = (timingId: string) => {
    setExpandedTimings(prev => {
      const next = new Set(prev);
      if (next.has(timingId)) {
        next.delete(timingId);
      } else {
        next.add(timingId);
      }
      return next;
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">{crop.name}</h2>
          <div className="flex items-center gap-4 mt-2">
            {editingAcres ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={acresValue}
                  onChange={(e) => setAcresValue(Number(e.target.value))}
                  className="w-24 px-3 py-1 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-stone-500">acres</span>
                <button onClick={handleSaveAcres} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditingAcres(false); setAcresValue(crop.totalAcres); }} className="p-1 text-stone-400 hover:bg-stone-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingAcres(true)} className="flex items-center gap-2 text-stone-500 hover:text-stone-700">
                <span>{formatNumber(crop.totalAcres, 0)} acres</span>
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-stone-500">Total Cost</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(calculations.totalCost)}</p>
          <p className="text-sm text-stone-500 mt-1">{formatCurrency(calculations.costPerAcre)}/acre</p>
        </div>
      </div>

      {/* Tier Configuration */}
      <div className="mb-6">
        <TierManager crop={crop} onUpdate={onUpdate} />
      </div>

      {/* Nutrient Summary */}
      <div className="mb-6">
        <NutrientSummaryPanel crop={crop} products={products} />
      </div>

      {/* Seed Treatments */}
      <div className="mb-6">
        <SeedTreatmentCalculator crop={crop} products={products} onUpdate={onUpdate} />
      </div>

      {/* Application Timings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-stone-800">Application Schedule</h3>
        
        {crop.applicationTimings.map(timing => {
          const timingApps = crop.applications.filter(a => a.timingId === timing.id);
          const isExpanded = expandedTimings.has(timing.id);
          const timingCost = calculations.timingCosts[timing.id] || 0;
          
          return (
            <div key={timing.id} className="bg-white rounded-xl shadow-sm border border-stone-200">
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-stone-50"
                onClick={() => toggleTimingExpanded(timing.id)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-stone-400" /> : <ChevronRight className="w-5 h-5 text-stone-400" />}
                  <h3 className="font-semibold text-stone-800">{timing.name}</h3>
                  <span className="text-sm text-stone-400">({timingApps.length} products)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium text-emerald-600">{formatCurrency(timingCost)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTiming(timing.id); }}
                    className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-6 pb-4">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        <th className="pb-2 pr-4">Product</th>
                        <th className="pb-2 pr-4 w-24">Rate</th>
                        <th className="pb-2 pr-4 w-20">Unit</th>
                        <th className="pb-2 pr-4 w-32">Tier</th>
                        <th className="pb-2 pr-4 w-24 text-right">$/Acre</th>
                        <th className="pb-2 pr-4 w-28 text-right">Tier Cost</th>
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {timingApps.map(app => {
                        const product = products.find(p => p.id === app.productId);
                        const tier = crop.tiers.find(t => t.id === app.tierId);
                        
                        let costPerAcre = 0;
                        if (product && tier) {
                          if (product.form === 'liquid') {
                            const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
                            costPerAcre = gallonsPerAcre * product.price;
                          } else {
                            const poundsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
                            const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
                            costPerAcre = poundsPerAcre * pricePerPound;
                          }
                        }
                        
                        const tierAcres = tier ? crop.totalAcres * (tier.percentage / 100) : 0;
                        const tierCost = costPerAcre * tierAcres;
                        
                        const rateUnits = product?.form === 'liquid' ? ['oz', 'qt', 'gal'] : ['oz', 'lbs', 'g', 'ton'];
                        
                        return (
                          <tr key={app.id} className="hover:bg-stone-50">
                            <td className="py-2 pr-4">
                              <select
                                value={app.productId}
                                onChange={(e) => handleUpdateApplication(app.id, { productId: e.target.value })}
                                className="w-full px-2 py-1 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({formatCurrency(p.price)}/{p.priceUnit})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-4">
                              <input
                                type="number"
                                value={app.rate}
                                onChange={(e) => handleUpdateApplication(app.id, { rate: Number(e.target.value) })}
                                className="w-full px-2 py-1 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                min={0}
                                step={0.1}
                              />
                            </td>
                            <td className="py-2 pr-4">
                              <select
                                value={app.rateUnit}
                                onChange={(e) => handleUpdateApplication(app.id, { rateUnit: e.target.value as RateUnit })}
                                className="w-full px-2 py-1 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                {rateUnits.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-4">
                              <select
                                value={app.tierId}
                                onChange={(e) => handleUpdateApplication(app.id, { tierId: e.target.value })}
                                className="w-full px-2 py-1 border border-stone-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                {crop.tiers.map(t => (
                                  <option key={t.id} value={t.id}>{t.name} ({t.percentage}%)</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-4 text-right text-stone-600 text-sm">{formatCurrency(costPerAcre)}</td>
                            <td className="py-2 pr-4 text-right font-medium text-emerald-600 text-sm">{formatCurrency(tierCost)}</td>
                            <td className="py-2">
                              <button onClick={() => handleDeleteApplication(app.id)} className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <button
                    onClick={() => handleAddApplication(timing.id)}
                    className="mt-3 flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Add Product
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Timing */}
        {showAddTiming ? (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Timing name (e.g., In Furrow, V6 Foliar, R2)"
                value={newTimingName}
                onChange={(e) => setNewTimingName(e.target.value)}
                className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <button onClick={handleAddTiming} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                Add Timing
              </button>
              <button onClick={() => { setShowAddTiming(false); setNewTimingName(''); }} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTiming(true)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Application Timing
          </button>
        )}
      </div>

      {/* Delete Crop */}
      <div className="mt-8 pt-8 border-t border-stone-200">
        <button onClick={onDelete} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm">
          <Trash2 className="w-4 h-4" />
          Delete Crop
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// PRODUCTS VIEW (New Architecture)
// ============================================================================

const ProductsViewNew: React.FC<{
  productMasters: ProductMaster[];
  vendorOfferings: VendorOffering[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  onUpdateProductMasters: (productMasters: ProductMaster[]) => void;
  onUpdateOfferings: (offerings: VendorOffering[]) => void;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
  onNavigateToVendor?: (vendorId: string) => void;
}> = ({ 
  productMasters, 
  vendorOfferings, 
  vendors, 
  inventory,
  onUpdateProductMasters, 
  onUpdateOfferings,
  onUpdateInventory,
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

  if (selectedProduct) {
    return (
      <ProductDetailView
        product={selectedProduct}
        vendorOfferings={vendorOfferings}
        vendors={vendors}
        inventory={inventory}
        onUpdateProduct={handleUpdateProduct}
        onUpdateOfferings={onUpdateOfferings}
        onUpdateInventory={onUpdateInventory}
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
// INVENTORY VIEW (With Add Inventory functionality)
// ============================================================================

const InventoryView: React.FC<{
  inventory: InventoryItem[];
  products: Product[];
  onUpdateInventory: (inventory: InventoryItem[]) => void;
}> = ({ inventory, products, onUpdateInventory }) => {
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [newProductId, setNewProductId] = useState('');
  const [newQuantity, setNewQuantity] = useState(0);

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      onUpdateInventory(inventory.filter(i => i.id !== id));
    } else {
      onUpdateInventory(inventory.map(i => i.id === id ? { ...i, quantity } : i));
    }
  };

  const handleAddInventory = () => {
    if (!newProductId || newQuantity <= 0) return;
    const product = products.find(p => p.id === newProductId);
    if (!product) return;

    const existing = inventory.find(i => i.productId === newProductId);
    if (existing) {
      onUpdateInventory(inventory.map(i => 
        i.productId === newProductId 
          ? { ...i, quantity: i.quantity + newQuantity } 
          : i
      ));
    } else {
      const item: InventoryItem = {
        id: generateId(),
        productId: newProductId,
        quantity: newQuantity,
        unit: product.form === 'liquid' ? 'gal' : 'lbs',
      };
      onUpdateInventory([...inventory, item]);
    }
    setShowAddInventory(false);
    setNewProductId('');
    setNewQuantity(0);
  };

  const handleDeleteInventory = (id: string) => {
    onUpdateInventory(inventory.filter(i => i.id !== id));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">Inventory</h2>
          <p className="text-stone-500 mt-1">Track your on-hand product quantities</p>
        </div>
        <button
          onClick={() => setShowAddInventory(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
        >
          <Plus className="w-5 h-5" />
          Add Inventory
        </button>
      </div>

      {/* Add Inventory Modal */}
      {showAddInventory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b border-stone-200">
              <h3 className="font-semibold text-lg text-stone-800">Add Inventory</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Product</label>
                <select
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min={0}
                  placeholder="Enter quantity"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
              <button
                onClick={() => { setShowAddInventory(false); setNewProductId(''); setNewQuantity(0); }}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddInventory}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
              >
                Add Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-stone-200">
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50">
              <th className="text-left px-6 py-4 text-xs font-semibold text-stone-500 uppercase">Product</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">On Hand</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-stone-500 uppercase">Value</th>
              <th className="px-6 py-4 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {inventory.map(item => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return null;
              
              let value = item.quantity * product.price;
              if (product.priceUnit === 'ton') {
                value = (item.quantity / 2000) * product.price;
              }
              
              return (
                <tr key={item.id} className="hover:bg-stone-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${product.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                        {product.form === 'liquid' ? <Droplets className="w-5 h-5 text-blue-600" /> : <Weight className="w-5 h-5 text-amber-600" />}
                      </div>
                      <span className="font-medium text-stone-800">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleUpdateQuantity(item.id, Number(e.target.value))}
                      className="w-24 px-2 py-1 text-right border border-stone-300 rounded"
                    />
                    <span className="ml-2 text-stone-500">{item.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-600 font-medium">{formatCurrency(value)}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDeleteInventory(item.id)}
                      className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {inventory.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-stone-400">
                  No inventory items. Click "Add Inventory" to track products you have on hand.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
// MAIN APP CONTENT (Uses hooks for data)
// ============================================================================

const AppContent: React.FC = () => {
  const { user, signOut } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);

  // Use localStorage for state with migration
  const [state, setState] = useState<AppState>(() => {
    // Try new key first
    let saved = localStorage.getItem('farmcalc-state-v2');
    
    // If no v2 data, check old key and migrate
    if (!saved) {
      const oldSaved = localStorage.getItem('farmcalc-state');
      if (oldSaved) {
        saved = oldSaved;
        // Clear old key after reading
        localStorage.removeItem('farmcalc-state');
      }
    }
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Apply migration to new structure
        return migrateAppState(parsed);
      } catch (e) {
        console.error('Failed to parse saved state');
      }
    }
    
    // Default state - use initialState from file which has complete crop plans
    return migrateAppState(defaultInitialState);
  });

  // Get legacy products for backward-compatible components
  const legacyProducts = useMemo(() => 
    getProductsAsLegacy(state.productMasters || [], state.vendorOfferings || []),
    [state.productMasters, state.vendorOfferings]
  );

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('farmcalc-state-v2', JSON.stringify(state));
  }, [state]);

  const currentSeason = state.seasons.find(s => s.id === state.currentSeasonId) || null;

  const handleSeasonChange = (seasonId: string) => {
    setState(prev => ({ ...prev, currentSeasonId: seasonId }));
  };

  const handleUpdateSeason = (updatedSeason: Season) => {
    setState(prev => ({
      ...prev,
      seasons: prev.seasons.map(s => s.id === updatedSeason.id ? updatedSeason : s),
    }));
  };

  const handleAddSeason = (season: Season) => {
    setState(prev => ({
      ...prev,
      seasons: [...prev.seasons, season],
      currentSeasonId: season.id,
    }));
  };

  const handleDeleteSeason = (seasonId: string) => {
    setState(prev => {
      const newSeasons = prev.seasons.filter(s => s.id !== seasonId);
      return {
        ...prev,
        seasons: newSeasons,
        currentSeasonId: newSeasons[0]?.id || null,
      };
    });
  };

  const handleUpdateProducts = (products: Product[]) => {
    setState(prev => ({ ...prev, products }));
  };

  const handleUpdateProductMasters = (productMasters: ProductMaster[]) => {
    setState(prev => ({ ...prev, productMasters }));
  };

  const handleUpdateVendorOfferings = (vendorOfferings: VendorOffering[]) => {
    setState(prev => ({ ...prev, vendorOfferings }));
  };

  const handleUpdateVendors = (vendors: Vendor[]) => {
    setState(prev => ({ ...prev, vendors }));
  };

  const handleUpdateInventory = (inventory: InventoryItem[]) => {
    setState(prev => ({ ...prev, inventory }));
  };

  const handleResetData = () => {
    localStorage.removeItem('farmcalc-state-v2');
    setState(migrateAppState(defaultInitialState));
  };

  const handleSync = async () => {
    setIsSyncing(true);
    // Placeholder for cloud sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSyncing(false);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            season={currentSeason}
            products={legacyProducts}
            inventory={state.inventory}
            vendors={state.vendors}
          />
        );
      case 'crops':
        return (
          <CropPlannerView
            season={currentSeason}
            products={legacyProducts}
            vendors={state.vendors}
            inventory={state.inventory}
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
            onUpdateProductMasters={handleUpdateProductMasters}
            onUpdateOfferings={handleUpdateVendorOfferings}
            onUpdateInventory={handleUpdateInventory}
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
            onUpdateVendors={handleUpdateVendors}
            onNavigateToProduct={() => setActiveView('products')}
          />
        );
      case 'inventory':
        return (
          <InventoryView
            inventory={state.inventory}
            products={legacyProducts}
            onUpdateInventory={handleUpdateInventory}
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
      default:
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

  // Show auth page if not logged in and not skipping
  if (!user && !skipAuth) {
    return <AuthPage onAuthSuccess={onSkipAuth} />;
  }

  return <AppContent />;
};

export default App;
