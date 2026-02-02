import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import type { Equipment } from '@/types/field';
import { EQUIPMENT_TYPE_LABELS } from '@/types/field';
import { EquipmentEditModal } from './EquipmentEditModal';

interface EquipmentListViewProps {
  equipment: Equipment[];
  onAddEquipment: (equipment: Equipment) => Promise<void>;
  onUpdateEquipment: (equipment: Equipment) => Promise<void>;
  onDeleteEquipment: (equipmentId: string) => Promise<void>;
}

export const EquipmentListView: React.FC<EquipmentListViewProps> = ({
  equipment,
  onAddEquipment,
  onUpdateEquipment,
  onDeleteEquipment,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [deletingEquipment, setDeletingEquipment] = useState<Equipment | null>(null);

  const handleAdd = async (item: Equipment) => {
    await onAddEquipment(item);
    setShowAddModal(false);
  };

  const handleUpdate = async (item: Equipment) => {
    await onUpdateEquipment(item);
    setEditingEquipment(null);
  };

  const handleDelete = async () => {
    if (deletingEquipment) {
      await onDeleteEquipment(deletingEquipment.id);
      setDeletingEquipment(null);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Equipment</h2>
          <p className="text-muted-foreground mt-1">Configure sprayers and application equipment</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Equipment
        </Button>
      </div>

      {/* Table or Empty State */}
      {equipment.length > 0 ? (
        <div className="bg-card rounded-xl shadow-sm border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Tank Size</TableHead>
                <TableHead className="text-right">Default GPA</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{EQUIPMENT_TYPE_LABELS[item.type]}</TableCell>
                  <TableCell className="text-right">{item.tankSize.toLocaleString()} gal</TableCell>
                  <TableCell className="text-right">
                    {item.defaultCarrierGPA !== undefined ? `${item.defaultCarrierGPA} GPA` : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingEquipment(item)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingEquipment(item)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border p-12 text-center">
          <Truck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">No Equipment</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Add your sprayers and application equipment to use with the Mix Calculator.
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Equipment
          </Button>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <EquipmentEditModal
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Modal */}
      {editingEquipment && (
        <EquipmentEditModal
          equipment={editingEquipment}
          onSave={handleUpdate}
          onClose={() => setEditingEquipment(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEquipment} onOpenChange={() => setDeletingEquipment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingEquipment?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
