import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  ListOrdered, 
  Beaker,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { ChemicalData, MixingOrder, Compatibility, WaterQuality, MixingOrderCategory } from '@/types/chemicalData';
import { MIXING_ORDER_GUIDE } from '@/types/chemicalData';

interface ChemicalProductMixingTabProps {
  chemicalData: ChemicalData | undefined;
  onUpdate: (data: ChemicalData) => void;
}

export function ChemicalProductMixingTab({
  chemicalData,
  onUpdate,
}: ChemicalProductMixingTabProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<ChemicalData>(chemicalData || {});

  const data = chemicalData || {};
  const mixingOrder = data.mixingOrder;
  const compatibility = data.compatibility || {};

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

  return (
    <div className="space-y-6">
      {/* Mixing Order */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ListOrdered className="w-4 h-4" />
              Mixing Order
            </CardTitle>
            <CardDescription>When to add this product in a tank mix</CardDescription>
          </div>
          {editingSection !== 'mixingOrder' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('mixingOrder')}>
              <Edit2 className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}><X className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={handleSave}><Check className="w-4 h-4 text-emerald-600" /></Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'mixingOrder' ? (
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
          ) : mixingOrder ? (
            <div className="space-y-4">
              {/* Visual mixing order indicator */}
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary text-2xl font-bold">
                  {mixingOrder.priority}
                </div>
                <div>
                  <div className="font-medium text-lg">
                    {MIXING_ORDER_GUIDE[mixingOrder.category]?.description || mixingOrder.category}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Add {mixingOrder.priority <= 3 ? 'early' : mixingOrder.priority <= 6 ? 'mid' : 'late'} in mixing sequence
                  </div>
                </div>
              </div>
              {mixingOrder.notes && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">{mixingOrder.notes}</div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No mixing order specified</p>
          )}
        </CardContent>
      </Card>

      {/* Compatibility */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Beaker className="w-4 h-4" />
              Compatibility
            </CardTitle>
            <CardDescription>Tank mix partners and incompatibilities</CardDescription>
          </div>
          {editingSection !== 'compatibility' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('compatibility')}>
              <Edit2 className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}><X className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={handleSave}><Check className="w-4 h-4 text-emerald-600" /></Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'compatibility' ? (
            <div className="space-y-4">
              <div>
                <Label>Synergists (products that enhance efficacy)</Label>
                <Input
                  placeholder="Comma-separated product names"
                  value={editData.compatibility?.synergists?.join(', ') ?? ''}
                  onChange={(e) => updateCompatibility('synergists', e.target.value ? e.target.value.split(',').map(s => s.trim()) : [])}
                />
              </div>
              <div>
                <Label>Antagonists (products that reduce efficacy)</Label>
                <Input
                  placeholder="Comma-separated product names"
                  value={editData.compatibility?.antagonists?.join(', ') ?? ''}
                  onChange={(e) => updateCompatibility('antagonists', e.target.value ? e.target.value.split(',').map(s => s.trim()) : [])}
                />
              </div>
              <div>
                <Label>Incompatible (physical incompatibility)</Label>
                <Input
                  placeholder="Comma-separated product names"
                  value={editData.compatibility?.incompatible?.join(', ') ?? ''}
                  onChange={(e) => updateCompatibility('incompatible', e.target.value ? e.target.value.split(',').map(s => s.trim()) : [])}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editData.compatibility?.jarTest ?? false}
                  onCheckedChange={(checked) => updateCompatibility('jarTest', checked)}
                />
                <Label>Jar test recommended before mixing</Label>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Compatibility notes"
                  value={editData.compatibility?.notes ?? ''}
                  onChange={(e) => updateCompatibility('notes', e.target.value || undefined)}
                  className="h-20"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {compatibility.synergists && compatibility.synergists.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Synergists (enhance efficacy)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {compatibility.synergists.map((s, i) => (
                      <Badge key={i} variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {compatibility.antagonists && compatibility.antagonists.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Antagonists (reduce efficacy)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {compatibility.antagonists.map((a, i) => (
                      <Badge key={i} variant="secondary" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {compatibility.incompatible && compatibility.incompatible.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    Incompatible (do not mix)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {compatibility.incompatible.map((inc, i) => (
                      <Badge key={i} variant="destructive">
                        {inc}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {compatibility.jarTest && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <Beaker className="w-5 h-5 text-amber-500" />
                  <span className="font-medium">Jar test recommended before tank mixing</span>
                </div>
              )}
              {compatibility.notes && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">{compatibility.notes}</div>
              )}
              {!compatibility.synergists?.length && !compatibility.antagonists?.length && 
               !compatibility.incompatible?.length && !compatibility.jarTest && !compatibility.notes && (
                <p className="text-sm text-muted-foreground italic">No compatibility information recorded</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Water Quality */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base">Water Quality Requirements</CardTitle>
            <CardDescription>pH and hardness considerations</CardDescription>
          </div>
          {editingSection !== 'waterQuality' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('waterQuality')}>
              <Edit2 className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}><X className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={handleSave}><Check className="w-4 h-4 text-emerald-600" /></Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'waterQuality' ? (
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
                  placeholder="Water quality notes"
                  value={editData.compatibility?.waterQuality?.notes ?? ''}
                  onChange={(e) => updateWaterQuality('notes', e.target.value || undefined)}
                />
              </div>
            </div>
          ) : compatibility.waterQuality ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(compatibility.waterQuality.phMin !== undefined || compatibility.waterQuality.phMax !== undefined) && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase mb-1">pH Range</div>
                  <div className="font-medium">
                    {compatibility.waterQuality.phMin ?? '?'} - {compatibility.waterQuality.phMax ?? '?'}
                  </div>
                </div>
              )}
              {compatibility.waterQuality.phOptimal !== undefined && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Optimal pH</div>
                  <div className="font-medium">{compatibility.waterQuality.phOptimal}</div>
                </div>
              )}
              {compatibility.waterQuality.hardnessMax !== undefined && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Max Hardness</div>
                  <div className="font-medium">{compatibility.waterQuality.hardnessMax} ppm</div>
                </div>
              )}
              {compatibility.waterQuality.notes && (
                <div className="col-span-2 md:col-span-4 p-3 bg-muted/50 rounded-lg text-sm">
                  {compatibility.waterQuality.notes}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No water quality requirements specified</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
