// ============================================================================
// Chemical Data Tab - Display and edit pesticide-specific data
// For herbicides, fungicides, insecticides
// ============================================================================

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Shield, 
  Beaker, 
  ListOrdered,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChemicalData, 
  ActiveIngredient, 
  RotationRestriction,
  SIGNAL_WORD_LABELS,
  FORMULATION_TYPES,
  MIXING_ORDER_GUIDE,
  isPesticideCategory,
  type SignalWord,
  type MixingOrderCategory,
} from '@/types/chemicalData';

interface ChemicalDataTabProps {
  chemicalData: ChemicalData | undefined;
  category: string;
  onUpdate: (data: ChemicalData) => void;
}

export const ChemicalDataTab: React.FC<ChemicalDataTabProps> = ({
  chemicalData,
  category,
  onUpdate,
}) => {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<ChemicalData>(chemicalData || {});

  const isPesticide = isPesticideCategory(category);

  if (!isPesticide) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Beaker className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Chemical data is only applicable to pesticides</p>
        <p className="text-sm">(herbicides, fungicides, insecticides, seed treatments)</p>
      </div>
    );
  }

  const data = chemicalData || {};
  const hasData = data.activeIngredients?.length || data.restrictions || data.epaRegNumber;

  const handleSave = (section: string) => {
    onUpdate(editData);
    setEditingSection(null);
  };

  const handleCancel = () => {
    setEditData(chemicalData || {});
    setEditingSection(null);
  };

  // Active Ingredients Section
  const ActiveIngredientsSection = () => {
    const ingredients = editingSection === 'ingredients' 
      ? (editData.activeIngredients || [])
      : (data.activeIngredients || []);

    const addIngredient = () => {
      setEditData({
        ...editData,
        activeIngredients: [...(editData.activeIngredients || []), { name: '', concentration: '' }],
      });
    };

    const removeIngredient = (index: number) => {
      setEditData({
        ...editData,
        activeIngredients: editData.activeIngredients?.filter((_, i) => i !== index),
      });
    };

    const updateIngredient = (index: number, field: keyof ActiveIngredient, value: string) => {
      const updated = [...(editData.activeIngredients || [])];
      updated[index] = { ...updated[index], [field]: value };
      setEditData({ ...editData, activeIngredients: updated });
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base">Active Ingredients</CardTitle>
            <CardDescription>Chemical compounds and concentrations</CardDescription>
          </div>
          {editingSection !== 'ingredients' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('ingredients')}>
              <Edit2 className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleSave('ingredients')}>
                <Check className="w-4 h-4 text-emerald-600" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {ingredients.length === 0 && editingSection !== 'ingredients' ? (
            <p className="text-sm text-muted-foreground">No active ingredients recorded</p>
          ) : (
            <div className="space-y-3">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  {editingSection === 'ingredients' ? (
                    <>
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Ingredient name"
                          value={ing.name}
                          onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                        />
                        <Input
                          placeholder="Concentration (e.g., 41%)"
                          value={ing.concentration || ''}
                          onChange={(e) => updateIngredient(i, 'concentration', e.target.value)}
                        />
                        <Input
                          placeholder="MOA Group (e.g., 9)"
                          value={ing.moaGroup || ''}
                          onChange={(e) => updateIngredient(i, 'moaGroup', e.target.value)}
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeIngredient(i)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ing.name}</span>
                        {ing.concentration && (
                          <Badge variant="secondary">{ing.concentration}</Badge>
                        )}
                        {ing.moaGroup && (
                          <Badge variant="outline">Group {ing.moaGroup}</Badge>
                        )}
                      </div>
                      {ing.chemicalClass && (
                        <p className="text-sm text-muted-foreground mt-1">{ing.chemicalClass}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {editingSection === 'ingredients' && (
                <Button variant="outline" size="sm" onClick={addIngredient}>
                  <Plus className="w-4 h-4 mr-2" /> Add Ingredient
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Restrictions Section
  const RestrictionsSection = () => {
    const restrictions = editingSection === 'restrictions' 
      ? (editData.restrictions || {})
      : (data.restrictions || {});

    const updateRestriction = (field: string, value: any) => {
      setEditData({
        ...editData,
        restrictions: { ...editData.restrictions, [field]: value },
      });
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              Restrictions & Intervals
            </CardTitle>
          </div>
          {editingSection !== 'restrictions' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('restrictions')}>
              <Edit2 className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleSave('restrictions')}>
                <Check className="w-4 h-4 text-emerald-600" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'restrictions' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>PHI (days)</Label>
                <Input
                  type="number"
                  placeholder="Pre-harvest interval"
                  value={editData.restrictions?.phiDays || ''}
                  onChange={(e) => updateRestriction('phiDays', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>REI (hours)</Label>
                <Input
                  type="number"
                  placeholder="Restricted entry interval"
                  value={editData.restrictions?.reiHours || ''}
                  onChange={(e) => updateRestriction('reiHours', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Max Rate/Application</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Value"
                    value={editData.restrictions?.maxRatePerApplication?.value || ''}
                    onChange={(e) => updateRestriction('maxRatePerApplication', { 
                      ...editData.restrictions?.maxRatePerApplication,
                      value: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                  />
                  <Input
                    placeholder="Unit"
                    value={editData.restrictions?.maxRatePerApplication?.unit || ''}
                    onChange={(e) => updateRestriction('maxRatePerApplication', { 
                      ...editData.restrictions?.maxRatePerApplication,
                      unit: e.target.value 
                    })}
                  />
                </div>
              </div>
              <div>
                <Label>Max Rate/Season</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Value"
                    value={editData.restrictions?.maxRatePerSeason?.value || ''}
                    onChange={(e) => updateRestriction('maxRatePerSeason', { 
                      ...editData.restrictions?.maxRatePerSeason,
                      value: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                  />
                  <Input
                    placeholder="Unit"
                    value={editData.restrictions?.maxRatePerSeason?.unit || ''}
                    onChange={(e) => updateRestriction('maxRatePerSeason', { 
                      ...editData.restrictions?.maxRatePerSeason,
                      unit: e.target.value 
                    })}
                  />
                </div>
              </div>
              <div>
                <Label>Max Applications/Season</Label>
                <Input
                  type="number"
                  placeholder="Number of applications"
                  value={editData.restrictions?.maxApplicationsPerSeason || ''}
                  onChange={(e) => updateRestriction('maxApplicationsPerSeason', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Buffer Zone (feet)</Label>
                <Input
                  type="number"
                  placeholder="Distance from water"
                  value={editData.restrictions?.bufferZoneFeet || ''}
                  onChange={(e) => updateRestriction('bufferZoneFeet', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {restrictions.phiDays !== undefined && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">PHI</div>
                  <div className="text-lg font-semibold">{restrictions.phiDays} days</div>
                </div>
              )}
              {restrictions.reiHours !== undefined && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">REI</div>
                  <div className="text-lg font-semibold">{restrictions.reiHours} hours</div>
                </div>
              )}
              {restrictions.maxRatePerApplication && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">Max/App</div>
                  <div className="text-lg font-semibold">
                    {restrictions.maxRatePerApplication.value} {restrictions.maxRatePerApplication.unit}
                  </div>
                </div>
              )}
              {restrictions.maxRatePerSeason && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">Max/Season</div>
                  <div className="text-lg font-semibold">
                    {restrictions.maxRatePerSeason.value} {restrictions.maxRatePerSeason.unit}
                  </div>
                </div>
              )}
              {restrictions.maxApplicationsPerSeason && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">Max Apps</div>
                  <div className="text-lg font-semibold">{restrictions.maxApplicationsPerSeason}x</div>
                </div>
              )}
              {restrictions.bufferZoneFeet && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase">Buffer</div>
                  <div className="text-lg font-semibold">{restrictions.bufferZoneFeet} ft</div>
                </div>
              )}
              {!restrictions.phiDays && !restrictions.reiHours && !restrictions.maxRatePerApplication && (
                <p className="text-sm text-muted-foreground col-span-full">No restrictions recorded</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Regulatory & Mixing Section
  const RegulatorySection = () => {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base">Regulatory & Mixing</CardTitle>
          </div>
          {editingSection !== 'regulatory' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('regulatory')}>
              <Edit2 className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleSave('regulatory')}>
                <Check className="w-4 h-4 text-emerald-600" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {editingSection === 'regulatory' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>EPA Reg. No.</Label>
                <Input
                  placeholder="e.g., 524-445"
                  value={editData.epaRegNumber || ''}
                  onChange={(e) => setEditData({ ...editData, epaRegNumber: e.target.value })}
                />
              </div>
              <div>
                <Label>Signal Word</Label>
                <Select 
                  value={editData.signalWord || ''} 
                  onValueChange={(v) => setEditData({ ...editData, signalWord: v as SignalWord })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select signal word" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SIGNAL_WORD_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Formulation Type</Label>
                <Select 
                  value={editData.formulationType || ''} 
                  onValueChange={(v) => setEditData({ ...editData, formulationType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select formulation" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMULATION_TYPES.map((f) => (
                      <SelectItem key={f.code} value={f.code}>{f.code} - {f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mixing Order Priority (1-10)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  placeholder="Lower = add first"
                  value={editData.mixingOrder?.priority || ''}
                  onChange={(e) => setEditData({ 
                    ...editData, 
                    mixingOrder: { 
                      ...editData.mixingOrder, 
                      priority: e.target.value ? parseInt(e.target.value) : 5,
                      category: editData.mixingOrder?.category || 'other',
                    } 
                  })}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.epaRegNumber && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase">EPA Reg. No.</div>
                  <div className="font-mono">{data.epaRegNumber}</div>
                </div>
              )}
              {data.signalWord && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Signal Word</div>
                  <Badge 
                    variant={data.signalWord === 'danger' ? 'destructive' : data.signalWord === 'warning' ? 'default' : 'secondary'}
                  >
                    {SIGNAL_WORD_LABELS[data.signalWord]}
                  </Badge>
                </div>
              )}
              {data.formulationType && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Formulation</div>
                  <Badge variant="outline">{data.formulationType}</Badge>
                </div>
              )}
              {data.mixingOrder && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                          Mixing Order <Info className="w-3 h-3" />
                        </div>
                        <div className="flex items-center gap-2">
                          <ListOrdered className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">#{data.mixingOrder.priority}</span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add to tank in order #{data.mixingOrder.priority}</p>
                      {data.mixingOrder.notes && <p className="text-xs">{data.mixingOrder.notes}</p>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!data.epaRegNumber && !data.signalWord && !data.formulationType && (
                <p className="text-sm text-muted-foreground col-span-full">No regulatory data recorded</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Rotation Restrictions Section
  const RotationSection = () => {
    const rotations = editingSection === 'rotations' 
      ? (editData.restrictions?.rotationRestrictions || [])
      : (data.restrictions?.rotationRestrictions || []);

    const addRotation = () => {
      setEditData({
        ...editData,
        restrictions: {
          ...editData.restrictions,
          rotationRestrictions: [...(editData.restrictions?.rotationRestrictions || []), { crop: '', days: 0 }],
        },
      });
    };

    const removeRotation = (index: number) => {
      setEditData({
        ...editData,
        restrictions: {
          ...editData.restrictions,
          rotationRestrictions: editData.restrictions?.rotationRestrictions?.filter((_, i) => i !== index),
        },
      });
    };

    const updateRotation = (index: number, field: keyof RotationRestriction, value: any) => {
      const updated = [...(editData.restrictions?.rotationRestrictions || [])];
      updated[index] = { ...updated[index], [field]: value };
      setEditData({
        ...editData,
        restrictions: { ...editData.restrictions, rotationRestrictions: updated },
      });
    };

    if (rotations.length === 0 && editingSection !== 'rotations') {
      return null;
    }

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-500" />
              Crop Rotation Restrictions
            </CardTitle>
          </div>
          {editingSection !== 'rotations' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('rotations')}>
              <Edit2 className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleSave('rotations')}>
                <Check className="w-4 h-4 text-emerald-600" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rotations.map((rot, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                {editingSection === 'rotations' ? (
                  <>
                    <Input
                      className="flex-1"
                      placeholder="Crop"
                      value={rot.crop}
                      onChange={(e) => updateRotation(i, 'crop', e.target.value)}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      placeholder="Days"
                      value={rot.days || ''}
                      onChange={(e) => updateRotation(i, 'days', e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeRotation(i)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{rot.crop}</span>
                    <span className="text-muted-foreground">—</span>
                    <span>{rot.days ? `${rot.days} days` : rot.months ? `${rot.months} months` : 'See label'}</span>
                    {rot.notes && <span className="text-sm text-muted-foreground">({rot.notes})</span>}
                  </>
                )}
              </div>
            ))}
            {editingSection === 'rotations' && (
              <Button variant="outline" size="sm" onClick={addRotation}>
                <Plus className="w-4 h-4 mr-2" /> Add Restriction
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {!hasData && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">No chemical data yet</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Upload a product label to auto-extract restrictions, or add data manually below.
                </p>
              </div>
            </div>
          </div>
        )}

        <ActiveIngredientsSection />
        <RestrictionsSection />
        <RegulatorySection />
        <RotationSection />
      </div>
    </TooltipProvider>
  );
};

export default ChemicalDataTab;
