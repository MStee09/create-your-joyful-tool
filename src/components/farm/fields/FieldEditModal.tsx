import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Field, SoilType } from '@/types/field';
import { SOIL_TYPE_LABELS, SOIL_TYPES, createDefaultField } from '@/types/field';

interface FieldEditModalProps {
  field?: Field;
  existingFarms: string[];
  onSave: (field: Field) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

export const FieldEditModal: React.FC<FieldEditModalProps> = ({
  field,
  existingFarms,
  onSave,
  onDelete,
  onClose,
}) => {
  const isEditing = !!field;
  const [formData, setFormData] = useState({
    name: field?.name ?? '',
    acres: field?.acres?.toString() ?? '',
    farm: field?.farm ?? '',
    soilType: field?.soilType ?? '',
    pH: field?.pH?.toString() ?? '',
    organicMatter: field?.organicMatter?.toString() ?? '',
    cec: field?.cec?.toString() ?? '',
    notes: field?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.acres) {
      return;
    }

    setSaving(true);
    try {
      const updatedField: Field = field
        ? {
            ...field,
            name: formData.name.trim(),
            acres: Number(formData.acres) || 0,
            farm: formData.farm.trim() || undefined,
            soilType: (formData.soilType as SoilType) || undefined,
            pH: formData.pH ? Number(formData.pH) : undefined,
            organicMatter: formData.organicMatter ? Number(formData.organicMatter) : undefined,
            cec: formData.cec ? Number(formData.cec) : undefined,
            notes: formData.notes.trim() || undefined,
            updatedAt: new Date().toISOString(),
          }
        : createDefaultField({
            name: formData.name.trim(),
            acres: Number(formData.acres) || 0,
            farm: formData.farm.trim() || undefined,
            soilType: (formData.soilType as SoilType) || undefined,
            pH: formData.pH ? Number(formData.pH) : undefined,
            organicMatter: formData.organicMatter ? Number(formData.organicMatter) : undefined,
            cec: formData.cec ? Number(formData.cec) : undefined,
            notes: formData.notes.trim() || undefined,
          });

      await onSave(updatedField);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Field' : 'Add Field'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Field Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., North 80"
                required
              />
            </div>

            {/* Acres + Farm */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="acres">Acres *</Label>
                <Input
                  id="acres"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.acres}
                  onChange={(e) => setFormData({ ...formData, acres: e.target.value })}
                  placeholder="80"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farm">Farm</Label>
                <Input
                  id="farm"
                  value={formData.farm}
                  onChange={(e) => setFormData({ ...formData, farm: e.target.value })}
                  placeholder="e.g., Home Farm"
                  list="farms"
                />
                <datalist id="farms">
                  {existingFarms.map(farm => (
                    <option key={farm} value={farm} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Soil Type */}
            <div className="space-y-2">
              <Label>Soil Type</Label>
              <Select
                value={formData.soilType}
                onValueChange={(value) => setFormData({ ...formData, soilType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select soil type..." />
                </SelectTrigger>
                <SelectContent>
                  {SOIL_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {SOIL_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* pH, OM, CEC */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ph">pH</Label>
                <Input
                  id="ph"
                  type="number"
                  step="0.1"
                  min="0"
                  max="14"
                  value={formData.pH}
                  onChange={(e) => setFormData({ ...formData, pH: e.target.value })}
                  placeholder="6.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="om">Organic Matter %</Label>
                <Input
                  id="om"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.organicMatter}
                  onChange={(e) => setFormData({ ...formData, organicMatter: e.target.value })}
                  placeholder="3.2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cec">CEC</Label>
                <Input
                  id="cec"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.cec}
                  onChange={(e) => setFormData({ ...formData, cec: e.target.value })}
                  placeholder="18"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Tile outlet on west side, wet spot SE corner..."
                rows={3}
              />
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              {isEditing && onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !formData.name.trim() || !formData.acres}>
                  {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Field'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{field?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete?.();
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
