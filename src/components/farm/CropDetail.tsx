import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import type { Crop, Product, Vendor, InventoryItem, Application, ApplicationTiming, Tier, RateUnit, LiquidUnit, DryUnit } from '@/types/farm';
import { formatCurrency, formatNumber, convertToGallons, convertToPounds, generateId } from '@/utils/farmUtils';
import { TIMING_BUCKET_INFO, getStageOrder } from '@/lib/growthStages';

interface CropDetailProps {
  crop: Crop;
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  onUpdate: (crop: Crop) => void;
  onDelete: () => void;
}

export const CropDetail: React.FC<CropDetailProps> = ({
  crop,
  products,
  vendors,
  inventory,
  onUpdate,
  onDelete,
}) => {
  const [editingAcres, setEditingAcres] = useState(false);
  const [acresValue, setAcresValue] = useState(crop.totalAcres);
  const [showAddTiming, setShowAddTiming] = useState(false);
  const [newTimingName, setNewTimingName] = useState('');
  const [expandedTimings, setExpandedTimings] = useState<Set<string>>(new Set(crop.applicationTimings.map(t => t.id)));

  // Sort timings by bucket then growth stage then order
  const sortedTimings = useMemo(() => {
    return crop.applicationTimings
      .slice()
      .sort((a, b) => {
        const bucketOrderA = TIMING_BUCKET_INFO[a.timingBucket || 'IN_SEASON'].order;
        const bucketOrderB = TIMING_BUCKET_INFO[b.timingBucket || 'IN_SEASON'].order;
        if (bucketOrderA !== bucketOrderB) return bucketOrderA - bucketOrderB;
        
        if ((a.timingBucket || 'IN_SEASON') === 'IN_SEASON') {
          const stageOrderA = getStageOrder(crop.cropType, a.growthStageStart, crop.name);
          const stageOrderB = getStageOrder(crop.cropType, b.growthStageStart, crop.name);
          if (stageOrderA !== stageOrderB) return stageOrderA - stageOrderB;
        }
        
        return a.order - b.order;
      });
  }, [crop.applicationTimings, crop.cropType, crop.name]);

  const calculations = useMemo(() => {
    let totalCost = 0;
    const timingCosts: Record<string, number> = {};
    
    crop.applications.forEach(app => {
      const product = products.find(p => p.id === app.productId);
      const tier = crop.tiers.find(t => t.id === app.tierId);
      if (!product || !tier) return;
      
      const tierAcres = crop.totalAcres * (tier.percentage / 100);
      let costPerAcre = 0;
      
      if (product.form === 'liquid') {
        const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
        costPerAcre = gallonsPerAcre * product.price;
      } else {
        const poundsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
        const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
        costPerAcre = poundsPerAcre * pricePerPound;
      }
      
      const tierCost = costPerAcre * tierAcres;
      totalCost += tierCost;
      
      if (!timingCosts[app.timingId]) {
        timingCosts[app.timingId] = 0;
      }
      timingCosts[app.timingId] += tierCost;
    });
    
    return { totalCost, timingCosts, costPerAcre: crop.totalAcres > 0 ? totalCost / crop.totalAcres : 0 };
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
      acresPercentage: 100,
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

  const handleUpdateTier = (tierId: string, updates: Partial<Tier>) => {
    onUpdate({
      ...crop,
      tiers: crop.tiers.map(t => t.id === tierId ? { ...t, ...updates } : t),
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
          <h2 className="text-3xl font-bold text-foreground">{crop.name}</h2>
          <div className="flex items-center gap-4 mt-2">
            {editingAcres ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={acresValue}
                  onChange={(e) => setAcresValue(Number(e.target.value))}
                  className="w-24 px-3 py-1 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                <span className="text-muted-foreground">acres</span>
                <button
                  onClick={handleSaveAcres}
                  className="p-1 text-primary hover:bg-primary/10 rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setEditingAcres(false); setAcresValue(crop.totalAcres); }}
                  className="p-1 text-muted-foreground hover:bg-muted rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingAcres(true)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <span>{formatNumber(crop.totalAcres, 0)} acres</span>
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(calculations.totalCost)}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {formatCurrency(calculations.costPerAcre)}/acre
          </p>
        </div>
      </div>

      {/* Tier Configuration */}
      <div className="bg-card rounded-xl shadow-sm border border-border mb-6">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Tier Configuration</h3>
          <p className="text-sm text-muted-foreground">Customize trial percentages for this crop</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-5 gap-4">
            {crop.tiers.map(tier => (
              <div key={tier.id} className="text-center">
                <p className="text-sm font-medium text-muted-foreground mb-2">{tier.name}</p>
                <div className="flex items-center justify-center gap-1">
                  <input
                    type="number"
                    value={tier.percentage}
                    onChange={(e) => handleUpdateTier(tier.id, { percentage: Number(e.target.value) })}
                    className="w-16 px-2 py-1 text-center border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    min={0}
                    max={100}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(crop.totalAcres * (tier.percentage / 100), 0)} acres
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application Timings */}
      <div className="space-y-4">
        {sortedTimings.map(timing => {
          const timingApps = crop.applications.filter(a => a.timingId === timing.id);
          const isExpanded = expandedTimings.has(timing.id);
          const timingCost = calculations.timingCosts[timing.id] || 0;
          
          return (
            <div key={timing.id} className="bg-card rounded-xl shadow-sm border border-border">
              <div
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-muted/30"
                onClick={() => toggleTimingExpanded(timing.id)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                  <h3 className="font-semibold text-foreground">{timing.name}</h3>
                  <span className="text-sm text-muted-foreground">({timingApps.length} products)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium text-primary">{formatCurrency(timingCost)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTiming(timing.id); }}
                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-6 pb-4">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <th className="pb-2 pr-4">Product</th>
                        <th className="pb-2 pr-4 w-24">Rate</th>
                        <th className="pb-2 pr-4 w-20">Unit</th>
                        <th className="pb-2 pr-4 w-32">Tier</th>
                        <th className="pb-2 pr-4 w-24 text-right">$/Acre</th>
                        <th className="pb-2 pr-4 w-28 text-right">Tier Cost</th>
                        <th className="pb-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {timingApps.map(app => {
                        const product = products.find(p => p.id === app.productId);
                        const tier = crop.tiers.find(t => t.id === app.tierId);
                        if (!product) return null;
                        
                        const rateUnits = product.form === 'liquid' 
                          ? ['oz', 'qt', 'gal'] 
                          : ['oz', 'lbs', 'g', 'ton'];
                        
                        let costPerAcre = 0;
                        if (product.form === 'liquid') {
                          const gallonsPerAcre = convertToGallons(app.rate, app.rateUnit as LiquidUnit);
                          costPerAcre = gallonsPerAcre * product.price;
                        } else {
                          const poundsPerAcre = convertToPounds(app.rate, app.rateUnit as DryUnit);
                          const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
                          costPerAcre = poundsPerAcre * pricePerPound;
                        }
                        
                        const tierAcres = tier ? crop.totalAcres * (tier.percentage / 100) : 0;
                        const tierCost = costPerAcre * tierAcres;
                        
                        return (
                          <tr key={app.id} className="border-t border-border">
                            <td className="py-2 pr-4">
                              <select
                                value={app.productId}
                                onChange={(e) => handleUpdateApplication(app.id, { productId: e.target.value })}
                                className="w-full px-2 py-1 border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                              >
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-4">
                              <input
                                type="number"
                                value={app.rate}
                                onChange={(e) => handleUpdateApplication(app.id, { rate: Number(e.target.value) })}
                                className="w-full px-2 py-1 border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                min={0}
                                step={0.1}
                              />
                            </td>
                            <td className="py-2 pr-4">
                              <select
                                value={app.rateUnit}
                                onChange={(e) => handleUpdateApplication(app.id, { rateUnit: e.target.value as RateUnit })}
                                className="w-full px-2 py-1 border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
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
                                className="w-full px-2 py-1 border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                              >
                                {crop.tiers.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({t.percentage}%)
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-4 text-right text-muted-foreground text-sm">
                              {formatCurrency(costPerAcre)}
                            </td>
                            <td className="py-2 pr-4 text-right font-medium text-primary text-sm">
                              {formatCurrency(tierCost)}
                            </td>
                            <td className="py-2">
                              <button
                                onClick={() => handleDeleteApplication(app.id)}
                                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                              >
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
                    className="mt-3 flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg"
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
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Timing name (e.g., In Furrow, V6 Foliar, R2)"
                value={newTimingName}
                onChange={(e) => setNewTimingName(e.target.value)}
                className="flex-1 px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                autoFocus
              />
              <button
                onClick={handleAddTiming}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
              >
                Add Timing
              </button>
              <button
                onClick={() => { setShowAddTiming(false); setNewTimingName(''); }}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTiming(true)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Application Timing
          </button>
        )}
      </div>

      {/* Delete Crop */}
      <div className="mt-8 pt-8 border-t border-border">
        <button
          onClick={onDelete}
          className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Delete Crop
        </button>
      </div>
    </div>
  );
};
