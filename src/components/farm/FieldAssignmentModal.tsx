import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatNumber } from '@/utils/farmUtils';
import type { Field, FieldAssignment } from '@/types/field';
import type { Crop, Season } from '@/types/farm';

interface FieldAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  crop: Crop;
  season: Season;
  fields: Field[];
  fieldAssignments: FieldAssignment[];
  onSave: (assignments: FieldAssignment[]) => void;
}

export const FieldAssignmentModal: React.FC<FieldAssignmentModalProps> = ({
  isOpen,
  onClose,
  crop,
  season,
  fields,
  fieldAssignments,
  onSave,
}) => {
  // Get currently assigned field IDs for this crop
  const currentAssignedIds = useMemo(() => {
    return new Set(
      fieldAssignments
        .filter(fa => fa.cropId === crop.id && fa.seasonId === season.id)
        .map(fa => fa.fieldId)
    );
  }, [fieldAssignments, crop.id, season.id]);

  // Track selected fields
  const [selectedIds, setSelectedIds] = useState<Set<string>>(currentAssignedIds);

  // Get conflicts - fields assigned to other crops this season
  const conflictMap = useMemo(() => {
    const conflicts = new Map<string, string>();
    const seasonCrops = season.crops || [];
    
    for (const fa of fieldAssignments) {
      if (fa.seasonId === season.id && fa.cropId !== crop.id) {
        const assignedCrop = seasonCrops.find(c => c.id === fa.cropId);
        if (assignedCrop) {
          conflicts.set(fa.fieldId, assignedCrop.name);
        }
      }
    }
    
    return conflicts;
  }, [fieldAssignments, season, crop.id]);

  // Group fields by farm
  const fieldsByFarm = useMemo(() => {
    const grouped = new Map<string, Field[]>();
    
    for (const field of fields) {
      const farm = field.farm || 'Unassigned';
      if (!grouped.has(farm)) {
        grouped.set(farm, []);
      }
      grouped.get(farm)!.push(field);
    }
    
    // Sort by farm name
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [fields]);

  const toggleField = (fieldId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  const selectedCount = selectedIds.size;
  const selectedAcres = fields
    .filter(f => selectedIds.has(f.id))
    .reduce((sum, f) => sum + f.acres, 0);

  const handleSave = () => {
    // Create new assignments array
    const newAssignments: FieldAssignment[] = [];
    
    // Keep existing assignments for other crops
    for (const fa of fieldAssignments) {
      if (fa.seasonId !== season.id || fa.cropId !== crop.id) {
        // Check if this field is being reassigned to our crop
        if (!selectedIds.has(fa.fieldId) || fa.cropId === crop.id) {
          newAssignments.push(fa);
        }
      }
    }
    
    // Add/update assignments for selected fields
    for (const fieldId of selectedIds) {
      const field = fields.find(f => f.id === fieldId);
      if (!field) continue;
      
      const existingAssignment = fieldAssignments.find(
        fa => fa.fieldId === fieldId && fa.cropId === crop.id && fa.seasonId === season.id
      );
      
      if (existingAssignment) {
        newAssignments.push(existingAssignment);
      } else {
        newAssignments.push({
          id: crypto.randomUUID(),
          seasonId: season.id,
          fieldId,
          cropId: crop.id,
          acres: field.acres,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    onSave(newAssignments);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Fields to {crop.name}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No fields have been created yet.</p>
              <p className="text-sm mt-2">Go to Fields to add your fields first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fieldsByFarm.map(([farm, farmFields]) => (
                <div key={farm}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">{farm}</h4>
                  <div className="space-y-1">
                    {farmFields.map(field => {
                      const isSelected = selectedIds.has(field.id);
                      const conflictCrop = conflictMap.get(field.id);
                      
                      return (
                        <div
                          key={field.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-primary/5 border-primary/30' 
                              : 'bg-card border-border hover:bg-muted/50'
                          }`}
                          onClick={() => toggleField(field.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleField(field.id)}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground truncate">
                                {field.name}
                              </span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatNumber(field.acres, 0)} ac
                            </span>
                          </div>
                          
                          {conflictCrop && (
                            <div className="flex items-center gap-1.5 text-amber-600 text-sm">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="hidden sm:inline">{conflictCrop}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 ? (
              <>
                <span className="font-medium text-foreground">{selectedCount}</span> field{selectedCount !== 1 ? 's' : ''} · 
                <span className="font-medium text-foreground ml-1">{formatNumber(selectedAcres, 0)}</span> acres
              </>
            ) : (
              'No fields selected'
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Fields
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
