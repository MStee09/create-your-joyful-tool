import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Edit2, 
  Check, 
  X, 
  Clock, 
  Shield, 
  AlertTriangle, 
  Droplets,
  Leaf,
  Bug,
} from 'lucide-react';
import { RotationRestrictionsTable } from './RotationRestrictionsTable';
import type { ChemicalData, Restrictions, RotationRestriction } from '@/types/chemicalData';

interface ChemicalProductRestrictionsTabProps {
  chemicalData: ChemicalData | undefined;
  onUpdate: (data: ChemicalData) => void;
}

export function ChemicalProductRestrictionsTab({
  chemicalData,
  onUpdate,
}: ChemicalProductRestrictionsTabProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<ChemicalData>(chemicalData || {});

  const data = chemicalData || {};
  const restrictions = data.restrictions || {};

  const handleSave = () => {
    onUpdate(editData);
    setEditingSection(null);
  };

  const handleCancel = () => {
    setEditData(chemicalData || {});
    setEditingSection(null);
  };

  const updateRestriction = (field: keyof Restrictions, value: any) => {
    setEditData({
      ...editData,
      restrictions: { ...editData.restrictions, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      {/* Application Limits */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              Application Limits
            </CardTitle>
            <CardDescription>PHI, REI, maximum rates, and application counts</CardDescription>
          </div>
          {editingSection !== 'limits' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('limits')}>
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
          {editingSection === 'limits' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label>PHI (Pre-Harvest Interval) - Days</Label>
                <Input
                  type="number"
                  placeholder="Days before harvest"
                  value={editData.restrictions?.phiDays ?? ''}
                  onChange={(e) => updateRestriction('phiDays', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>REI (Restricted Entry Interval) - Hours</Label>
                <Input
                  type="number"
                  placeholder="Hours before re-entry"
                  value={editData.restrictions?.reiHours ?? ''}
                  onChange={(e) => updateRestriction('reiHours', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Max Applications Per Season</Label>
                <Input
                  type="number"
                  placeholder="Number of applications"
                  value={editData.restrictions?.maxApplicationsPerSeason ?? ''}
                  onChange={(e) => updateRestriction('maxApplicationsPerSeason', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Min Days Between Applications</Label>
                <Input
                  type="number"
                  placeholder="Days between apps"
                  value={editData.restrictions?.minDaysBetweenApplications ?? ''}
                  onChange={(e) => updateRestriction('minDaysBetweenApplications', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Max Rate Per Application</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Value"
                    value={editData.restrictions?.maxRatePerApplication?.value ?? ''}
                    onChange={(e) => updateRestriction('maxRatePerApplication', { 
                      ...editData.restrictions?.maxRatePerApplication,
                      value: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                  />
                  <Input
                    placeholder="Unit"
                    value={editData.restrictions?.maxRatePerApplication?.unit ?? ''}
                    onChange={(e) => updateRestriction('maxRatePerApplication', { 
                      ...editData.restrictions?.maxRatePerApplication,
                      unit: e.target.value 
                    })}
                    className="w-24"
                  />
                </div>
              </div>
              <div>
                <Label>Max Rate Per Season</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Value"
                    value={editData.restrictions?.maxRatePerSeason?.value ?? ''}
                    onChange={(e) => updateRestriction('maxRatePerSeason', { 
                      ...editData.restrictions?.maxRatePerSeason,
                      value: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                  />
                  <Input
                    placeholder="Unit"
                    value={editData.restrictions?.maxRatePerSeason?.unit ?? ''}
                    onChange={(e) => updateRestriction('maxRatePerSeason', { 
                      ...editData.restrictions?.maxRatePerSeason,
                      unit: e.target.value 
                    })}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg ${restrictions.phiDays !== undefined ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-muted/50'}`}>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase mb-1">
                  <Clock className="w-3 h-3" />
                  PHI
                </div>
                <div className="text-xl font-semibold">
                  {restrictions.phiDays !== undefined ? `${restrictions.phiDays} days` : '—'}
                </div>
              </div>
              <div className={`p-4 rounded-lg ${restrictions.reiHours !== undefined ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-muted/50'}`}>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase mb-1">
                  <Shield className="w-3 h-3" />
                  REI
                </div>
                <div className="text-xl font-semibold">
                  {restrictions.reiHours !== undefined ? `${restrictions.reiHours} hrs` : '—'}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground uppercase mb-1">Max/App</div>
                <div className="text-xl font-semibold">
                  {restrictions.maxRatePerApplication 
                    ? `${restrictions.maxRatePerApplication.value} ${restrictions.maxRatePerApplication.unit}`
                    : '—'
                  }
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground uppercase mb-1">Max/Season</div>
                <div className="text-xl font-semibold">
                  {restrictions.maxRatePerSeason 
                    ? `${restrictions.maxRatePerSeason.value} ${restrictions.maxRatePerSeason.unit}`
                    : '—'
                  }
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground uppercase mb-1">Max Apps</div>
                <div className="text-xl font-semibold">
                  {restrictions.maxApplicationsPerSeason ? `${restrictions.maxApplicationsPerSeason}x` : '—'}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground uppercase mb-1">Min Days Between</div>
                <div className="text-xl font-semibold">
                  {restrictions.minDaysBetweenApplications ? `${restrictions.minDaysBetweenApplications} days` : '—'}
                </div>
              </div>
              {restrictions.rainfast && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase mb-1">
                    <Droplets className="w-3 h-3" />
                    Rainfast
                  </div>
                  <div className="text-xl font-semibold">{restrictions.rainfast}</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environmental Restrictions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-500" />
              Environmental Restrictions
            </CardTitle>
            <CardDescription>Buffer zones, groundwater, pollinators</CardDescription>
          </div>
          {editingSection !== 'environmental' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('environmental')}>
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
          {editingSection === 'environmental' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Buffer Zone (feet)</Label>
                <Input
                  type="number"
                  placeholder="Distance from water"
                  value={editData.restrictions?.bufferZoneFeet ?? ''}
                  onChange={(e) => updateRestriction('bufferZoneFeet', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label>Rainfast</Label>
                <Input
                  placeholder="e.g., 1 hour, 4 hours"
                  value={editData.restrictions?.rainfast ?? ''}
                  onChange={(e) => updateRestriction('rainfast', e.target.value || undefined)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editData.restrictions?.groundwaterAdvisory ?? false}
                  onCheckedChange={(checked) => updateRestriction('groundwaterAdvisory', checked)}
                />
                <Label>Groundwater Advisory</Label>
              </div>
              <div>
                <Label>Pollinator Precautions</Label>
                <Input
                  placeholder="e.g., Do not apply during bloom"
                  value={editData.restrictions?.pollinator ?? ''}
                  onChange={(e) => updateRestriction('pollinator', e.target.value || undefined)}
                />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Additional restriction notes"
                  value={editData.restrictions?.notes ?? ''}
                  onChange={(e) => updateRestriction('notes', e.target.value || undefined)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {restrictions.bufferZoneFeet && (
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="font-medium">Buffer Zone Required</div>
                    <div className="text-sm text-muted-foreground">{restrictions.bufferZoneFeet} feet from water</div>
                  </div>
                </div>
              )}
              {restrictions.groundwaterAdvisory && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <Droplets className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="font-medium">Groundwater Advisory</div>
                    <div className="text-sm text-muted-foreground">Check local restrictions for use in sensitive areas</div>
                  </div>
                </div>
              )}
              {restrictions.pollinator && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <Bug className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="font-medium">Pollinator Precautions</div>
                    <div className="text-sm text-muted-foreground">{restrictions.pollinator}</div>
                  </div>
                </div>
              )}
              {restrictions.notes && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm">{restrictions.notes}</div>
                </div>
              )}
              {!restrictions.bufferZoneFeet && !restrictions.groundwaterAdvisory && !restrictions.pollinator && !restrictions.notes && (
                <p className="text-sm text-muted-foreground italic">No environmental restrictions recorded</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rotation Restrictions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <div>
            <CardTitle className="text-base">Rotation Restrictions</CardTitle>
            <CardDescription>Plantback intervals for subsequent crops</CardDescription>
          </div>
          {editingSection !== 'rotation' ? (
            <Button variant="ghost" size="sm" onClick={() => setEditingSection('rotation')}>
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
          <RotationRestrictionsTable
            restrictions={editingSection === 'rotation' 
              ? (editData.restrictions?.rotationRestrictions || []) 
              : (restrictions.rotationRestrictions || [])
            }
            editable={editingSection === 'rotation'}
            onChange={(reqs) => setEditData({ 
              ...editData, 
              restrictions: { ...editData.restrictions, rotationRestrictions: reqs } 
            })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
