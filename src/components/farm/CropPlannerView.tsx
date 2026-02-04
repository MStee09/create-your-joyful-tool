import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import type { Season, Product, Vendor, InventoryItem, Crop } from '@/types/farm';
import type { ProductMaster, PriceBookEntry } from '@/types';
import type { Field, FieldAssignment, FieldCropOverride } from '@/types/field';
import { createDefaultCrop } from '@/data/initialData';
import { formatNumber } from '@/utils/farmUtils';
import { CropPlanningView } from './CropPlanningView';

interface CropPlannerViewProps {
  season: Season | null;
  products: Product[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  productMasters: ProductMaster[];
  priceBook: PriceBookEntry[];
  fields: Field[];
  fieldAssignments: FieldAssignment[];
  fieldCropOverrides: FieldCropOverride[];
  onUpdateSeason: (season: Season) => void;
  onUpdateFieldAssignments: (assignments: FieldAssignment[]) => void;
  onUpdateFieldCropOverrides: (overrides: FieldCropOverride[]) => void;
  onNavigateToMixCalculator?: (fieldId: string, acres: number) => void;
  onAddProduct?: (product: ProductMaster) => void;
}

export const CropPlannerView: React.FC<CropPlannerViewProps> = ({
  season,
  products,
  vendors,
  inventory,
  productMasters,
  priceBook,
  fields,
  fieldAssignments,
  fieldCropOverrides,
  onUpdateSeason,
  onUpdateFieldAssignments,
  onUpdateFieldCropOverrides,
  onNavigateToMixCalculator,
  onAddProduct,
}) => {
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
        <p className="text-muted-foreground">No season selected</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Crop Tabs Sidebar */}
      <div className="w-56 bg-muted/50 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Crops</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {season.crops.map(crop => (
            <button
              key={crop.id}
              onClick={() => setActiveCropId(crop.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                activeCropId === crop.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <p className="font-medium">{crop.name}</p>
              <p className={`text-sm ${activeCropId === crop.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {formatNumber(crop.totalAcres, 0)} acres
              </p>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          {showAddCrop ? (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Crop name"
                value={newCropName}
                onChange={(e) => setNewCropName(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <input
                type="number"
                placeholder="Acres"
                value={newCropAcres}
                onChange={(e) => setNewCropAcres(Number(e.target.value))}
                className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddCrop}
                  className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddCrop(false)}
                  className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddCrop(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Crop
            </button>
          )}
        </div>
      </div>

      {/* Crop Detail */}
      <div className="flex-1 overflow-y-auto">
        {activeCrop && season ? (
          <CropPlanningView
            crop={activeCrop}
            season={season}
            products={products}
            vendors={vendors}
            inventory={inventory}
            productMasters={productMasters}
            priceBook={priceBook}
            fields={fields}
            fieldAssignments={fieldAssignments}
            fieldCropOverrides={fieldCropOverrides}
            onUpdate={handleUpdateCrop}
            onDelete={() => handleDeleteCrop(activeCrop.id)}
            onUpdateFieldAssignments={onUpdateFieldAssignments}
            onUpdateFieldCropOverrides={onUpdateFieldCropOverrides}
            onNavigateToMixCalculator={onNavigateToMixCalculator}
            onAddProduct={onAddProduct}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select or add a crop to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};
