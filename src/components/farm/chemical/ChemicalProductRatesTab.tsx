import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Edit2, Check, X, Droplets, Wind, Gauge } from 'lucide-react';
import { AdjuvantRequirementsTable } from './AdjuvantRequirementsTable';
import type { ChemicalData, RateRange, ApplicationRequirements, AdjuvantRequirement } from '@/types/chemicalData';
import { DROPLET_SIZE_LABELS } from '@/types/chemicalData';

interface ChemicalProductRatesTabProps {
  chemicalData: ChemicalData | undefined;
  onUpdate: (data: ChemicalData) => void;
}

export function ChemicalProductRatesTab({
  chemicalData,
  onUpdate,
}: ChemicalProductRatesTabProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<ChemicalData>(chemicalData || {});

  const data = chemicalData || {};

  const handleSave = () => {
    onUpdate(editData);
    setEditingSection(null);
  };

  const handleCancel = () => {
    setEditData(chemicalData || {});
    setEditingSection(null);
  };

  const updateRateRange = (field: keyof RateRange, value: any) => {
    setEditData({
      ...editData,
      rateRange: { ...editData.rateRange, [field]: value } as RateRange,
    });
  };

  const updateAppRequirements = (field: keyof ApplicationRequirements, value: any) => {
    setEditData({
      ...editData,
      applicationRequirements: { ...editData.applicationRequirements, [field]: value },
    });
  };

  const rateRange = data.rateRange;
  const appReqs = data.applicationRequirements;

  return (
    <div className="space-y-6">
      {/* Rate Range */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              Application Rate
            </CardTitle>
            <CardDescription>Recommended rate range for this product</CardDescription>
          </div>
          {editingSection !== 'rates' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('rates')}>
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
          {editingSection === 'rates' ? (
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Minimum</Label>
                <Input
                  type="number"
                  placeholder="Min rate"
                  value={editData.rateRange?.min || ''}
                  onChange={(e) => updateRateRange('min', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Typical</Label>
                <Input
                  type="number"
                  placeholder="Typical rate"
                  value={editData.rateRange?.typical || ''}
                  onChange={(e) => updateRateRange('typical', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Maximum</Label>
                <Input
                  type="number"
                  placeholder="Max rate"
                  value={editData.rateRange?.max || ''}
                  onChange={(e) => updateRateRange('max', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  placeholder="e.g., oz/ac"
                  value={editData.rateRange?.unit || ''}
                  onChange={(e) => updateRateRange('unit', e.target.value)}
                />
              </div>
              <div className="col-span-4">
                <Label>Notes</Label>
                <Input
                  placeholder="Rate notes or conditions"
                  value={editData.rateRange?.notes || ''}
                  onChange={(e) => updateRateRange('notes', e.target.value)}
                />
              </div>
            </div>
          ) : rateRange ? (
            <div className="space-y-4">
              {/* Visual Rate Slider */}
              {rateRange.min !== undefined && rateRange.max !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{rateRange.min} {rateRange.unit}</span>
                    {rateRange.typical && (
                      <span className="font-medium text-foreground">
                        Typical: {rateRange.typical} {rateRange.unit}
                      </span>
                    )}
                    <span>{rateRange.max} {rateRange.unit}</span>
                  </div>
                  <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-emerald-200 via-emerald-400 to-amber-400 rounded-full" />
                    {rateRange.typical && (
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-primary"
                        style={{ 
                          left: `${((rateRange.typical - rateRange.min) / (rateRange.max - rateRange.min)) * 100}%` 
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
              {rateRange.notes && (
                <p className="text-sm text-muted-foreground">{rateRange.notes}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No rate range specified</p>
          )}
        </CardContent>
      </Card>

      {/* Application Requirements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Application Requirements
            </CardTitle>
            <CardDescription>Carrier volume, droplet size, spray pressure</CardDescription>
          </div>
          {editingSection !== 'appReqs' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('appReqs')}>
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
          {editingSection === 'appReqs' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label>Carrier GPA (Min)</Label>
                <Input
                  type="number"
                  placeholder="Min GPA"
                  value={editData.applicationRequirements?.carrierGpaMin || ''}
                  onChange={(e) => updateAppRequirements('carrierGpaMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Carrier GPA (Max)</Label>
                <Input
                  type="number"
                  placeholder="Max GPA"
                  value={editData.applicationRequirements?.carrierGpaMax || ''}
                  onChange={(e) => updateAppRequirements('carrierGpaMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Droplet Size</Label>
                <Select 
                  value={editData.applicationRequirements?.dropletSize || ''} 
                  onValueChange={(v) => updateAppRequirements('dropletSize', v || undefined)}
                >
                  <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DROPLET_SIZE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Spray Pressure (Min PSI)</Label>
                <Input
                  type="number"
                  placeholder="Min PSI"
                  value={editData.applicationRequirements?.sprayPressureMin || ''}
                  onChange={(e) => updateAppRequirements('sprayPressureMin', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Spray Pressure (Max PSI)</Label>
                <Input
                  type="number"
                  placeholder="Max PSI"
                  value={editData.applicationRequirements?.sprayPressureMax || ''}
                  onChange={(e) => updateAppRequirements('sprayPressureMax', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Application Timing</Label>
                <Input
                  placeholder="e.g., V2-V6"
                  value={editData.applicationRequirements?.applicationTiming || ''}
                  onChange={(e) => updateAppRequirements('applicationTiming', e.target.value)}
                />
              </div>
            </div>
          ) : appReqs ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(appReqs.carrierGpaMin || appReqs.carrierGpaMax) && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase mb-1">
                    <Droplets className="w-3 h-3" />
                    Carrier
                  </div>
                  <div className="font-medium">
                    {appReqs.carrierGpaMin && appReqs.carrierGpaMax 
                      ? `${appReqs.carrierGpaMin}-${appReqs.carrierGpaMax} GPA`
                      : appReqs.carrierGpaTypical 
                        ? `${appReqs.carrierGpaTypical} GPA`
                        : `${appReqs.carrierGpaMin || appReqs.carrierGpaMax} GPA`
                    }
                  </div>
                </div>
              )}
              {appReqs.dropletSize && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase mb-1">
                    <Wind className="w-3 h-3" />
                    Droplet
                  </div>
                  <div className="font-medium">{DROPLET_SIZE_LABELS[appReqs.dropletSize]}</div>
                </div>
              )}
              {(appReqs.sprayPressureMin || appReqs.sprayPressureMax) && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase mb-1">
                    <Gauge className="w-3 h-3" />
                    Pressure
                  </div>
                  <div className="font-medium">
                    {appReqs.sprayPressureMin && appReqs.sprayPressureMax
                      ? `${appReqs.sprayPressureMin}-${appReqs.sprayPressureMax} PSI`
                      : `${appReqs.sprayPressureMin || appReqs.sprayPressureMax} PSI`
                    }
                  </div>
                </div>
              )}
              {appReqs.applicationTiming && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Timing</div>
                  <div className="font-medium">{appReqs.applicationTiming}</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No application requirements specified</p>
          )}
        </CardContent>
      </Card>

      {/* Adjuvant Requirements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base">Adjuvant Requirements</CardTitle>
            <CardDescription>Required or recommended tank mix partners</CardDescription>
          </div>
          {editingSection !== 'adjuvants' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('adjuvants')}>
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
          <AdjuvantRequirementsTable
            requirements={editingSection === 'adjuvants' ? (editData.adjuvantRequirements || []) : (data.adjuvantRequirements || [])}
            editable={editingSection === 'adjuvants'}
            onChange={(reqs) => setEditData({ ...editData, adjuvantRequirements: reqs })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
