import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Season, ProductMaster, InventoryItem } from '@/types';
import type { Field, FieldAssignment, Equipment } from '@/types/field';
import type { 
  ApplicationRecord, 
  ApplicationProductRecord, 
  InventoryShortage,
  OverriddenWarning,
  RecordApplicationContext,
} from '@/types/applicationRecord';
import { formatNumber } from '@/lib/calculations';
import { 
  checkRestrictions, 
  type RestrictionViolation,
  type RestrictionCheckContext,
  type PlannedApplication,
} from '@/lib/restrictionEngine';
import { 
  RestrictionWarningPanel, 
  buildOverriddenWarnings,
  allBlockingViolationsOverridden,
} from './RestrictionWarningPanel';

interface RecordApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<ApplicationRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  
  // Data
  season: Season;
  fields: Field[];
  fieldAssignments: FieldAssignment[];
  productMasters: ProductMaster[];
  inventory: InventoryItem[];
  equipment: Equipment[];
  applicationRecords: ApplicationRecord[];
  
  // Pre-population context
  context?: RecordApplicationContext;
}

interface ProductLine {
  productId: string;
  plannedRate: number;
  actualRate: number;
  rateUnit: string;
  totalApplied: number;
  wasAddedInSeason: boolean;
}

export const RecordApplicationModal: React.FC<RecordApplicationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  season,
  fields,
  fieldAssignments,
  productMasters,
  inventory,
  equipment,
  applicationRecords,
  context,
}) => {
  // Form state
  const [selectedCropId, setSelectedCropId] = useState<string>(context?.cropId || '');
  const [selectedTimingId, setSelectedTimingId] = useState<string>(context?.timingId || '');
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>(context?.fieldIds || []);
  const [dateApplied, setDateApplied] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(context?.equipmentId || '');
  const [carrierGPA, setCarrierGPA] = useState<string>(context?.carrierGPA?.toString() || '');
  const [applicator, setApplicator] = useState<'self' | 'custom'>('self');
  const [customApplicatorName, setCustomApplicatorName] = useState('');
  const [weatherNotes, setWeatherNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [showShortageWarning, setShowShortageWarning] = useState(false);
  const [shortages, setShortages] = useState<InventoryShortage[]>([]);
  
  // Restriction engine state
  const [restrictionOverrides, setRestrictionOverrides] = useState<
    Record<string, { reason: string; confirmed: boolean }>
  >({});

  // Get crops from season
  const crops = season?.crops || [];
  const selectedCrop = crops.find(c => c.id === selectedCropId);
  const timings = selectedCrop?.applicationTimings || [];
  const selectedTiming = timings.find(t => t.id === selectedTimingId);

  // Get fields assigned to this crop for current season
  const assignedFieldIds = useMemo(() => {
    if (!selectedCropId || !season) return [];
    return fieldAssignments
      .filter(fa => fa.seasonId === season.id && fa.cropId === selectedCropId)
      .map(fa => fa.fieldId);
  }, [fieldAssignments, selectedCropId, season]);

  const availableFields = useMemo(() => {
    return fields.filter(f => assignedFieldIds.includes(f.id));
  }, [fields, assignedFieldIds]);

  // Calculate total acres from selected fields
  const totalAcres = useMemo(() => {
    return selectedFieldIds.reduce((sum, fieldId) => {
      const assignment = fieldAssignments.find(
        fa => fa.fieldId === fieldId && fa.seasonId === season?.id && fa.cropId === selectedCropId
      );
      return sum + (assignment?.acres || 0);
    }, 0);
  }, [selectedFieldIds, fieldAssignments, season, selectedCropId]);

  // Load products from selected timing
  useEffect(() => {
    if (!selectedCrop || !selectedTimingId) {
      setProductLines([]);
      return;
    }

    const applications = selectedCrop.applications.filter(a => a.timingId === selectedTimingId);
    const lines: ProductLine[] = applications.map(app => ({
      productId: app.productId,
      plannedRate: app.rate,
      actualRate: app.rate, // Default to planned
      rateUnit: app.rateUnit,
      totalApplied: app.rate * totalAcres,
      wasAddedInSeason: false,
    }));

    // Also include context products if provided
    if (context?.products) {
      context.products.forEach(cp => {
        if (!lines.find(l => l.productId === cp.productId)) {
          lines.push({
            productId: cp.productId,
            plannedRate: cp.rate,
            actualRate: cp.rate,
            rateUnit: cp.rateUnit,
            totalApplied: cp.rate * totalAcres,
            wasAddedInSeason: true,
          });
        }
      });
    }

    setProductLines(lines);
  }, [selectedCrop, selectedTimingId, totalAcres, context?.products]);

  // Update equipment defaults
  useEffect(() => {
    if (selectedEquipmentId) {
      const eq = equipment.find(e => e.id === selectedEquipmentId);
      if (eq?.defaultCarrierGPA && !carrierGPA) {
        setCarrierGPA(eq.defaultCarrierGPA.toString());
      }
    }
  }, [selectedEquipmentId, equipment, carrierGPA]);

  // Update product totals when acres change
  useEffect(() => {
    setProductLines(prev => prev.map(line => ({
      ...line,
      totalApplied: line.actualRate * totalAcres,
    })));
  }, [totalAcres]);

  // Run restriction checks when selections change
  const restrictionViolations = useMemo((): RestrictionViolation[] => {
    if (!selectedCropId || !selectedTimingId || selectedFieldIds.length === 0 || productLines.length === 0) {
      return [];
    }

    const checkContext: RestrictionCheckContext = {
      season,
      fields,
      fieldAssignments,
      applicationRecords,
      productMasters,
    };

    const allViolations: RestrictionViolation[] = [];
    
    // Check each field separately
    for (const fieldId of selectedFieldIds) {
      const assignment = fieldAssignments.find(
        fa => fa.fieldId === fieldId && fa.seasonId === season?.id && fa.cropId === selectedCropId
      );
      const fieldAcres = assignment?.acres || 0;

      const plannedApps: PlannedApplication[] = productLines.map(line => ({
        productId: line.productId,
        rate: line.actualRate,
        rateUnit: line.rateUnit,
        acres: fieldAcres,
      }));

      const violations = checkRestrictions(
        checkContext,
        fieldId,
        selectedCropId,
        selectedTimingId,
        dateApplied,
        plannedApps
        // harvestDate would go here if we had it
      );

      allViolations.push(...violations);
    }

    // Deduplicate by id (same product/field combo)
    const seen = new Set<string>();
    return allViolations.filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  }, [
    selectedCropId,
    selectedTimingId,
    selectedFieldIds,
    productLines,
    dateApplied,
    season,
    fields,
    fieldAssignments,
    applicationRecords,
    productMasters,
  ]);

  // Check if all blocking violations are overridden
  const canSubmitWithRestrictions = useMemo(() => {
    return allBlockingViolationsOverridden(restrictionViolations, restrictionOverrides);
  }, [restrictionViolations, restrictionOverrides]);

  const handleOverrideChange = (violationId: string, reason: string, confirmed: boolean) => {
    setRestrictionOverrides(prev => ({
      ...prev,
      [violationId]: { reason, confirmed },
    }));
  };

  const handleRateChange = (productId: string, newRate: number) => {
    setProductLines(prev => prev.map(line => 
      line.productId === productId
        ? { ...line, actualRate: newRate, totalApplied: newRate * totalAcres }
        : line
    ));
  };

  const toggleFieldSelection = (fieldId: string) => {
    setSelectedFieldIds(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const selectAllFields = () => {
    setSelectedFieldIds(availableFields.map(f => f.id));
  };

  const checkInventoryShortages = (): InventoryShortage[] => {
    const shortageList: InventoryShortage[] = [];
    
    for (const line of productLines) {
      const product = productMasters.find(p => p.id === line.productId);
      if (!product) continue;

      const invItems = inventory.filter(i => i.productId === line.productId);
      const onHand = invItems.reduce((sum, i) => sum + i.quantity, 0);
      const needed = line.totalApplied;

      if (needed > onHand) {
        shortageList.push({
          productId: line.productId,
          productName: product.name,
          needed,
          onHand,
          shortage: needed - onHand,
          unit: line.rateUnit.includes('gal') ? 'gal' : 'lbs',
        });
      }
    }

    return shortageList;
  };

  const handleSubmit = async () => {
    if (!selectedCropId || !selectedTimingId || selectedFieldIds.length === 0) {
      return;
    }

    // Check for blocking restriction violations that haven't been overridden
    const hasBlockingRestrictions = restrictionViolations.some(
      v => v.severity === 'error' && v.canOverride
    );
    if (hasBlockingRestrictions && !canSubmitWithRestrictions) {
      return; // User must acknowledge all blocking violations
    }

    // Check for inventory shortages
    const foundShortages = checkInventoryShortages();
    if (foundShortages.length > 0) {
      setShortages(foundShortages);
      setShowShortageWarning(true);
      return;
    }

    await saveApplication();
  };

  const saveApplication = async () => {
    setSaving(true);
    try {
      const products: ApplicationProductRecord[] = productLines.map(line => {
        const product = productMasters.find(p => p.id === line.productId);
        return {
          productId: line.productId,
          productName: product?.name || 'Unknown',
          plannedRate: line.plannedRate,
          actualRate: line.actualRate,
          rateUnit: line.rateUnit,
          totalApplied: line.totalApplied,
          totalUnit: line.rateUnit.includes('gal') ? 'gal' : 'lbs',
          inventoryDeducted: false, // Will be set by the save handler
          wasAddedInSeason: line.wasAddedInSeason,
        };
      });

      // Create one record per field (or batch them - depends on preference)
      // For simplicity, we'll create one record per field
      for (const fieldId of selectedFieldIds) {
        const assignment = fieldAssignments.find(
          fa => fa.fieldId === fieldId && fa.seasonId === season.id && fa.cropId === selectedCropId
        );
        const fieldAcres = assignment?.acres || 0;

        // Scale product totals for this field
        const fieldProducts = products.map(p => ({
          ...p,
          totalApplied: p.actualRate * fieldAcres,
        }));

        // Build overridden warnings for this field
        const fieldOverriddenWarnings = buildOverriddenWarnings(
          restrictionViolations.filter(v => !v.fieldId || v.fieldId === fieldId),
          restrictionOverrides
        );

        await onSave({
          seasonId: season.id,
          cropId: selectedCropId,
          fieldId,
          timingId: selectedTimingId,
          dateApplied,
          acresTreated: fieldAcres,
          products: fieldProducts,
          equipmentId: selectedEquipmentId || undefined,
          carrierGPA: carrierGPA ? Number(carrierGPA) : undefined,
          applicator,
          customApplicatorName: applicator === 'custom' ? customApplicatorName : undefined,
          weatherNotes: weatherNotes || undefined,
          notes: notes || undefined,
          overriddenWarnings: fieldOverriddenWarnings.length > 0 ? fieldOverriddenWarnings : undefined,
        });
      }

      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAnyway = async () => {
    setShowShortageWarning(false);
    await saveApplication();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Application</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Crop & Timing Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Crop *</Label>
                <Select value={selectedCropId} onValueChange={setSelectedCropId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select crop..." />
                  </SelectTrigger>
                  <SelectContent>
                    {crops.map(crop => (
                      <SelectItem key={crop.id} value={crop.id}>
                        {crop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pass/Timing *</Label>
                <Select 
                  value={selectedTimingId} 
                  onValueChange={setSelectedTimingId}
                  disabled={!selectedCropId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pass..." />
                  </SelectTrigger>
                  <SelectContent>
                    {timings.map(timing => (
                      <SelectItem key={timing.id} value={timing.id}>
                        {timing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Field Selection */}
            {selectedCropId && availableFields.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Fields *</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={selectAllFields}
                    className="text-xs"
                  >
                    Select All
                  </Button>
                </div>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {availableFields.map(field => {
                    const assignment = fieldAssignments.find(
                      fa => fa.fieldId === field.id && fa.seasonId === season.id && fa.cropId === selectedCropId
                    );
                    const isSelected = selectedFieldIds.includes(field.id);
                    
                    return (
                      <label 
                        key={field.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleFieldSelection(field.id)}
                        />
                        <span className="flex-1 font-medium">{field.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(assignment?.acres || 0, 0)} ac
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground">
                  Selected: {formatNumber(totalAcres, 0)} acres across {selectedFieldIds.length} field(s)
                </p>
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label>Date Applied *</Label>
              <Input
                type="date"
                value={dateApplied}
                onChange={(e) => setDateApplied(e.target.value)}
              />
            </div>

            {/* Products Table */}
            {productLines.length > 0 && (
              <div className="space-y-2">
                <Label>Products</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Product</th>
                        <th className="text-right px-3 py-2 font-medium">Planned</th>
                        <th className="text-right px-3 py-2 font-medium">Actual Rate</th>
                        <th className="text-right px-3 py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {productLines.map(line => {
                        const product = productMasters.find(p => p.id === line.productId);
                        const variance = line.plannedRate > 0 
                          ? ((line.actualRate - line.plannedRate) / line.plannedRate * 100)
                          : 0;
                        
                        return (
                          <tr key={line.productId}>
                            <td className="px-3 py-2">
                              {product?.name || 'Unknown'}
                              {line.wasAddedInSeason && (
                                <span className="ml-2 text-xs text-blue-600">(added)</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {formatNumber(line.plannedRate, 2)} {line.rateUnit}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.actualRate}
                                onChange={(e) => handleRateChange(line.productId, Number(e.target.value))}
                                className="w-24 text-right inline-block"
                              />
                              <span className="ml-1 text-muted-foreground">{line.rateUnit}</span>
                              {Math.abs(variance) > 5 && (
                                <span className={`ml-2 text-xs ${variance > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                                  ({variance > 0 ? '+' : ''}{formatNumber(variance, 0)}%)
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {formatNumber(line.totalApplied, 1)} {line.rateUnit.includes('gal') ? 'gal' : 'lbs'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Restriction Warnings */}
            {restrictionViolations.length > 0 && (
              <RestrictionWarningPanel
                violations={restrictionViolations}
                overrides={restrictionOverrides}
                onOverrideChange={handleOverrideChange}
              />
            )}

            {/* Equipment & Carrier */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Equipment</Label>
                <Select 
                  value={selectedEquipmentId || "__none__"} 
                  onValueChange={(val) => setSelectedEquipmentId(val === "__none__" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {equipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name} ({eq.tankSize} gal)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Carrier (GPA)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={carrierGPA}
                  onChange={(e) => setCarrierGPA(e.target.value)}
                  placeholder="15"
                />
              </div>
            </div>

            {/* Applicator */}
            <div className="space-y-2">
              <Label>Applicator</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="applicator"
                    checked={applicator === 'self'}
                    onChange={() => setApplicator('self')}
                  />
                  <span>Self</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="applicator"
                    checked={applicator === 'custom'}
                    onChange={() => setApplicator('custom')}
                  />
                  <span>Custom Applicator</span>
                </label>
              </div>
              {applicator === 'custom' && (
                <Input
                  value={customApplicatorName}
                  onChange={(e) => setCustomApplicatorName(e.target.value)}
                  placeholder="Applicator name..."
                  className="mt-2"
                />
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Weather Notes</Label>
              <Input
                value={weatherNotes}
                onChange={(e) => setWeatherNotes(e.target.value)}
                placeholder="Wind, temperature, humidity..."
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={
                saving || 
                !selectedCropId || 
                !selectedTimingId || 
                selectedFieldIds.length === 0 ||
                (restrictionViolations.some(v => v.severity === 'error' && v.canOverride) && !canSubmitWithRestrictions)
              }
            >
              {saving ? 'Saving...' : 'Record Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inventory Shortage Warning Dialog */}
      <Dialog open={showShortageWarning} onOpenChange={setShowShortageWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Inventory Shortage
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              The following products don't have enough inventory on hand:
            </p>
            <div className="space-y-2">
              {shortages.map(shortage => (
                <div 
                  key={shortage.productId}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                >
                  <span className="font-medium">{shortage.productName}</span>
                  <span className="text-sm">
                    Need {formatNumber(shortage.needed, 1)} {shortage.unit}, 
                    have {formatNumber(shortage.onHand, 1)} {shortage.unit}
                    <span className="text-red-600 ml-2">
                      (short {formatNumber(shortage.shortage, 1)})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowShortageWarning(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSaveAnyway}>
              Save Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
