import React, { useState } from 'react';
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
import type { Equipment, EquipmentType } from '@/types/field';
import { EQUIPMENT_TYPE_LABELS, EQUIPMENT_TYPES, createDefaultEquipment } from '@/types/field';

interface EquipmentEditModalProps {
  equipment?: Equipment;
  onSave: (equipment: Equipment) => Promise<void>;
  onClose: () => void;
}

export const EquipmentEditModal: React.FC<EquipmentEditModalProps> = ({
  equipment,
  onSave,
  onClose,
}) => {
  const isEditing = !!equipment;
  const [formData, setFormData] = useState({
    name: equipment?.name ?? '',
    type: equipment?.type ?? 'sprayer',
    tankSize: equipment?.tankSize?.toString() ?? '',
    defaultCarrierGPA: equipment?.defaultCarrierGPA?.toString() ?? '',
    notes: equipment?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.tankSize) {
      return;
    }

    setSaving(true);
    try {
      const updatedEquipment: Equipment = equipment
        ? {
            ...equipment,
            name: formData.name.trim(),
            type: formData.type as EquipmentType || 'sprayer',
            tankSize: Number(formData.tankSize) || 0,
            defaultCarrierGPA: formData.defaultCarrierGPA ? Number(formData.defaultCarrierGPA) : undefined,
            notes: formData.notes.trim() || undefined,
            updatedAt: new Date().toISOString(),
          }
        : createDefaultEquipment({
            name: formData.name.trim(),
            type: formData.type as EquipmentType,
            tankSize: Number(formData.tankSize) || 0,
            defaultCarrierGPA: formData.defaultCarrierGPA ? Number(formData.defaultCarrierGPA) : undefined,
            notes: formData.notes.trim() || undefined,
          });

      await onSave(updatedEquipment);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., John Deere R4045"
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: EquipmentType) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {EQUIPMENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tank Size + Default GPA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tankSize">Tank Size (gal) *</Label>
              <Input
                id="tankSize"
                type="number"
                step="1"
                min="0"
                value={formData.tankSize}
                onChange={(e) => setFormData({ ...formData, tankSize: e.target.value })}
                placeholder="1200"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpa">Default Carrier GPA</Label>
              <Input
                id="gpa"
                type="number"
                step="0.1"
                min="0"
                value={formData.defaultCarrierGPA}
                onChange={(e) => setFormData({ ...formData, defaultCarrierGPA: e.target.value })}
                placeholder="15"
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
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !formData.name.trim() || !formData.tankSize}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Equipment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
