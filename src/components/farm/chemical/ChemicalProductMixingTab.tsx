import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Edit2, 
  Check, 
  X, 
  Info,
} from 'lucide-react';
import type { ChemicalData, MixingOrder, Compatibility, WaterQuality, MixingOrderCategory, CropMixingWarning, CarrierVolume } from '@/types/chemicalData';
import { MIXING_ORDER_GUIDE } from '@/types/chemicalData';
import { PreMixChecklist } from './PreMixChecklist';
import { TankMixSequence } from './TankMixSequence';
import { CropMixingWarnings } from './CropMixingWarnings';
import { CarrierVolumeCard } from './CarrierVolumeCard';
import { WaterQualityCard } from './WaterQualityCard';
import { AdjuvantRequirementsTable } from './AdjuvantRequirementsTable';

interface ChemicalProductMixingTabProps {
  chemicalData: ChemicalData | undefined;
  productName?: string;
  onUpdate: (data: ChemicalData) => void;
}

export function ChemicalProductMixingTab({
  chemicalData,
  productName,
  onUpdate,
}: ChemicalProductMixingTabProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<ChemicalData>(chemicalData || {});

  const data = chemicalData || {};
  const mixingOrder = data.mixingOrder;
  const compatibility = data.compatibility || {};
  const adjuvantRequirements = data.adjuvantRequirements || [];
  const hasAdjuvants = adjuvantRequirements.length > 0;

  const handleSave = () => {
    onUpdate(editData);
    setEditingSection(null);
  };

  const handleCancel = () => {
    setEditData(chemicalData || {});
    setEditingSection(null);
  };

  const updateMixingOrder = (field: keyof MixingOrder, value: any) => {
    setEditData({
      ...editData,
      mixingOrder: { ...editData.mixingOrder, [field]: value } as MixingOrder,
    });
  };

  const updateCompatibility = (field: keyof Compatibility, value: any) => {
    setEditData({
      ...editData,
      compatibility: { ...editData.compatibility, [field]: value },
    });
  };

  const updateWaterQuality = (field: keyof WaterQuality, value: any) => {
    setEditData({
      ...editData,
      compatibility: { 
        ...editData.compatibility, 
        waterQuality: { ...editData.compatibility?.waterQuality, [field]: value } 
      },
    });
  };

  const updateCarrierVolume = (field: keyof CarrierVolume, value: any) => {
    setEditData({
      ...editData,
      carrierVolume: { ...editData.carrierVolume, [field]: value },
    });
  };

  // Parse crop mixing warnings for editing
  const cropWarningsToString = (warnings?: CropMixingWarning[]) => {
    if (!warnings || warnings.length === 0) return '';
    return warnings.map(w => `${w.crop}: ${w.warning} (${w.severity})`).join('\n');
  };

  return (
    <div className="space-y-6">
      {/* 1. Pre-Mix Checklist - Safety First */}
      <div className="relative">
        <PreMixChecklist 
          compatibility={compatibility} 
          productName={productName}
        />
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute top-3 right-3"
          onClick={() => setEditingSection('preMix')}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        
        {/* Pre-Mix Edit Dialog */}
        {editingSection === 'preMix' && (
          <Card className="mt-4 border-primary">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Edit Pre-Mix Checklist</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel}><X className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={handleSave}><Check className="w-4 h-4 text-emerald-600" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={editData.compatibility?.jarTest ?? false}
                  onCheckedChange={(checked) => updateCompatibility('jarTest', checked)}
                />
                <Label>Jar test recommended before mixing</Label>
              </div>
              <div>
                <Label>DO NOT MIX (incompatible products)</Label>
                <Input
                  placeholder="Comma-separated: Ammonium nitrate, Potassium nitrate..."
                  value={editData.compatibility?.incompatible?.join(', ') ?? ''}
                  onChange={(e) => updateCompatibility('incompatible', e.target.value ? e.target.value.split(',').map(s => s.trim()) : [])}
                />
              </div>
              <div>
                <Label>CAUTION (may cause crop injury)</Label>
                <Input
                  placeholder="Comma-separated: EC products in cotton, POST in dry bean..."
                  value={editData.compatibility?.cautionWith?.join(', ') ?? ''}
                  onChange={(e) => updateCompatibility('cautionWith', e.target.value ? e.target.value.split(',').map(s => s.trim()) : [])}
                />
              </div>
              <div>
                <Label>Antagonists (reduce efficacy)</Label>
                <Input
                  placeholder="Comma-separated product names"
                  value={editData.compatibility?.antagonists?.join(', ') ?? ''}
                  onChange={(e) => updateCompatibility('antagonists', e.target.value ? e.target.value.split(',').map(s => s.trim()) : [])}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 2. Tank Mix Sequence */}
      <div className="relative">
        <TankMixSequence 
          productName={productName}
          formulationType={data.formulationType}
          mixingOrder={mixingOrder}
        />
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute top-3 right-3"
          onClick={() => setEditingSection('mixingOrder')}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        
        {editingSection === 'mixingOrder' && (
          <Card className="mt-4 border-primary">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Edit Mixing Order</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel}><X className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={handleSave}><Check className="w-4 h-4 text-emerald-600" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority (1-10, lower = add first)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    placeholder="Priority number"
                    value={editData.mixingOrder?.priority ?? ''}
                    onChange={(e) => updateMixingOrder('priority', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={editData.mixingOrder?.category || ''} 
                    onValueChange={(v) => updateMixingOrder('category', v as MixingOrderCategory)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MIXING_ORDER_GUIDE).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          {info.priority}. {info.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Mixing notes"
                    value={editData.mixingOrder?.notes ?? ''}
                    onChange={(e) => updateMixingOrder('notes', e.target.value || undefined)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 3. Adjuvants */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Adjuvants</CardTitle>
          {hasAdjuvants && (
            <p className="text-sm text-muted-foreground">
              When tank mixing with postemergence herbicides:
            </p>
          )}
        </CardHeader>
        <CardContent>
          <AdjuvantRequirementsTable 
            requirements={adjuvantRequirements}
            editable={false}
          />
          {!hasAdjuvants && (
            <div className="flex items-start gap-2 mt-3 p-2 rounded-lg bg-muted/50">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                {productName || 'This product'} may not require adjuvants for preemergence use. Follow label directions when tank mixing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Water Quality */}
      <div className="relative">
        <WaterQualityCard waterQuality={compatibility.waterQuality} />
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute top-3 right-3"
          onClick={() => setEditingSection('waterQuality')}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        
        {editingSection === 'waterQuality' && (
          <Card className="mt-4 border-primary">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Edit Water Quality</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel}><X className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={handleSave}><Check className="w-4 h-4 text-emerald-600" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>pH Min</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Min pH"
                    value={editData.compatibility?.waterQuality?.phMin ?? ''}
                    onChange={(e) => updateWaterQuality('phMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label>pH Max</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Max pH"
                    value={editData.compatibility?.waterQuality?.phMax ?? ''}
                    onChange={(e) => updateWaterQuality('phMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label>pH Optimal</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Optimal pH"
                    value={editData.compatibility?.waterQuality?.phOptimal ?? ''}
                    onChange={(e) => updateWaterQuality('phOptimal', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label>Max Hardness (ppm)</Label>
                  <Input
                    type="number"
                    placeholder="Max hardness"
                    value={editData.compatibility?.waterQuality?.hardnessMax ?? ''}
                    onChange={(e) => updateWaterQuality('hardnessMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
                <div className="col-span-2 md:col-span-4">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Water quality notes (e.g., Use spray-grade AMS if hard water)"
                    value={editData.compatibility?.waterQuality?.notes ?? ''}
                    onChange={(e) => updateWaterQuality('notes', e.target.value || undefined)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 5. Carrier Volume */}
      <div className="relative">
        <CarrierVolumeCard 
          carrierVolume={data.carrierVolume}
          applicationRequirements={data.applicationRequirements}
        />
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute top-3 right-3"
          onClick={() => setEditingSection('carrierVolume')}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        
        {editingSection === 'carrierVolume' && (
          <Card className="mt-4 border-primary">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Edit Carrier Volume</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel}><X className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={handleSave}><Check className="w-4 h-4 text-emerald-600" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>Aerial Min (gal/ac)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="e.g., 2"
                    value={editData.carrierVolume?.aerialMin ?? ''}
                    onChange={(e) => updateCarrierVolume('aerialMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label>Ground Min (gal/ac)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="e.g., 5"
                    value={editData.carrierVolume?.groundMin ?? ''}
                    onChange={(e) => updateCarrierVolume('groundMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label>Chemigation Range</Label>
                  <Input
                    placeholder="e.g., 0.33-0.67 in"
                    value={editData.carrierVolume?.chemigationRange ?? ''}
                    onChange={(e) => updateCarrierVolume('chemigationRange', e.target.value || undefined)}
                  />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Carrier volume notes"
                    value={editData.carrierVolume?.notes ?? ''}
                    onChange={(e) => updateCarrierVolume('notes', e.target.value || undefined)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 6. Crop-Specific Mixing Warnings */}
      {compatibility.cropMixingWarnings && compatibility.cropMixingWarnings.length > 0 && (
        <CropMixingWarnings warnings={compatibility.cropMixingWarnings} />
      )}

      {/* Synergists (optional bonus info) */}
      {compatibility.synergists && compatibility.synergists.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
              Tank Mix Partners (Enhanced Efficacy)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {compatibility.synergists.map((s, i) => (
                <span 
                  key={i} 
                  className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-sm"
                >
                  {s}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Compatibility Notes */}
      {compatibility.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Additional Mixing Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{compatibility.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
