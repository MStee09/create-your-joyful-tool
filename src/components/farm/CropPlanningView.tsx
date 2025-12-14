import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Check, X, Trash2, Settings } from 'lucide-react';
import type { Crop, Product, Vendor, InventoryItem, Application, ApplicationTiming } from '@/types/farm';
import { formatNumber, generateId } from '@/utils/farmUtils';
import { SeasonOverviewBar } from './SeasonOverviewBar';
import { PassCard } from './PassCard';
import { EntryModePanel } from './EntryModePanel';
import { calculateSeasonSummary } from '@/lib/cropCalculations';
import { useProductIntelligence } from '@/hooks/useProductIntelligence';

interface CropPlanningViewProps {
  crop: Crop;
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  onUpdate: (crop: Crop) => void;
  onDelete: () => void;
}

export const CropPlanningView: React.FC<CropPlanningViewProps> = ({
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
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [showTierManager, setShowTierManager] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  // Get product intelligence for function summaries
  const { purposes } = useProductIntelligence();

  // Calculate season summary
  const summary = useMemo(() => 
    calculateSeasonSummary(crop, products),
    [crop, products]
  );

  // Handlers
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
    setShowAddTiming(false);
    setNewTimingName('');
  };

  const handleDuplicateTiming = (timingId: string) => {
    const original = crop.applicationTimings.find(t => t.id === timingId);
    if (!original) return;

    const newTiming: ApplicationTiming = {
      id: generateId(),
      name: `${original.name} (copy)`,
      order: crop.applicationTimings.length,
    };

    // Duplicate all applications from the original timing
    const originalApps = crop.applications.filter(a => a.timingId === timingId);
    const newApps = originalApps.map(app => ({
      ...app,
      id: generateId(),
      timingId: newTiming.id,
    }));

    onUpdate({
      ...crop,
      applicationTimings: [...crop.applicationTimings, newTiming],
      applications: [...crop.applications, ...newApps],
    });
  };

  const handleDeleteTiming = (timingId: string) => {
    onUpdate({
      ...crop,
      applicationTimings: crop.applicationTimings.filter(t => t.id !== timingId),
      applications: crop.applications.filter(a => a.timingId !== timingId),
    });
  };

  const handleUpdateTiming = (updatedTiming: ApplicationTiming) => {
    onUpdate({
      ...crop,
      applicationTimings: crop.applicationTimings.map(t => 
        t.id === updatedTiming.id ? updatedTiming : t
      ),
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
      acresPercentage: 100,
    };
    onUpdate({
      ...crop,
      applications: [...crop.applications, newApp],
    });
    setEditingApplication(newApp);
  };

  const handleSaveApplication = (app: Application) => {
    onUpdate({
      ...crop,
      applications: crop.applications.map(a => a.id === app.id ? app : a),
    });
    setEditingApplication(null);
  };

  const handleDeleteApplication = (appId: string) => {
    onUpdate({
      ...crop,
      applications: crop.applications.filter(a => a.id !== appId),
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Season Overview Bar - Compact with collapsible insights */}
      <SeasonOverviewBar
        cropName={crop.name}
        totalAcres={crop.totalAcres}
        summary={summary}
        crop={crop}
        products={products}
        purposes={purposes}
        showInsights={showInsights}
        onToggleInsights={() => setShowInsights(!showInsights)}
        onUpdateCropName={(name) => onUpdate({ ...crop, name })}
      />

      {/* Main Content - Scrollable vertical timeline, immediately below header */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Acres Editor & Settings Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
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
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{formatNumber(crop.totalAcres, 0)} total acres</span>
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTierManager(!showTierManager)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Tier Presets
            </button>
          </div>
        </div>

        {/* Tier Presets Manager (collapsible) */}
        {showTierManager && (
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Tier Presets</h4>
            <p className="text-sm text-muted-foreground mb-3">
              These presets appear as quick-fill buttons when editing applications.
            </p>
            <div className="flex flex-wrap gap-2">
              {crop.tiers.map(tier => (
                <div key={tier.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{tier.name}</span>
                  <input
                    type="number"
                    value={tier.percentage}
                    onChange={(e) => onUpdate({
                      ...crop,
                      tiers: crop.tiers.map(t => 
                        t.id === tier.id ? { ...t, percentage: Number(e.target.value) } : t
                      ),
                    })}
                    className="w-14 px-2 py-1 text-center border border-input rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    min={0}
                    max={100}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pass Cards - Vertical Timeline */}
        {crop.applicationTimings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No application timings yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Add your first timing to start building your crop plan
            </p>
          </div>
        ) : (
          crop.applicationTimings
            .sort((a, b) => a.order - b.order)
            .map((timing, idx) => (
              <PassCard
                key={timing.id}
                timing={timing}
                crop={crop}
                products={products}
                vendors={vendors}
                purposes={purposes}
                onEditApplication={setEditingApplication}
                onAddApplication={handleAddApplication}
                onDuplicateTiming={handleDuplicateTiming}
                onDeleteTiming={handleDeleteTiming}
                onUpdateTiming={handleUpdateTiming}
                defaultExpanded={idx === 0}
              />
            ))
        )}

        {/* Add Timing */}
        {showAddTiming ? (
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Timing name (e.g., In Furrow, V6 Foliar, R2)"
                value={newTimingName}
                onChange={(e) => setNewTimingName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTiming()}
                className="flex-1 px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                autoFocus
              />
              <button
                onClick={handleAddTiming}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Add Timing
              </button>
              <button
                onClick={() => { setShowAddTiming(false); setNewTimingName(''); }}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm transition-colors"
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

        {/* Delete Crop */}
        <div className="mt-8 pt-8 border-t border-border">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Crop
          </button>
        </div>
      </div>

      {/* Entry Mode Panel - Slide-in from right */}
      {editingApplication && (
        <EntryModePanel
          application={editingApplication}
          crop={crop}
          products={products}
          onSave={handleSaveApplication}
          onDelete={handleDeleteApplication}
          onClose={() => setEditingApplication(null)}
        />
      )}
    </div>
  );
};
