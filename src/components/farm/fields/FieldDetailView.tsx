import React, { useState } from 'react';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Field, FieldAssignment } from '@/types/field';
import { SOIL_TYPE_LABELS } from '@/types/field';
import type { Season } from '@/types';
import { FieldEditModal } from './FieldEditModal';
import { FieldCropHistory } from './FieldCropHistory';

interface FieldDetailViewProps {
  field: Field;
  fieldAssignments: FieldAssignment[];
  seasons: Season[];
  onUpdateField: (field: Field) => Promise<boolean>;
  onBack: () => void;
}

export const FieldDetailView: React.FC<FieldDetailViewProps> = ({
  field,
  fieldAssignments,
  seasons,
  onUpdateField,
  onBack,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);

  // We don't have access to all fields here, so we can't show existing farms
  // The modal will just allow free text entry
  const existingFarms: string[] = [];

  const handleSave = async (updatedField: Field) => {
    await onUpdateField(updatedField);
    setShowEditModal(false);
  };

  return (
    <div className="p-8">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Fields
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{field.name}</h1>
          <p className="text-muted-foreground mt-1">
            {field.farm ? `${field.farm} · ` : ''}{field.acres.toLocaleString()} acres
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowEditModal(true)}>
          <Edit2 className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Soil Attributes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Soil Attributes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Soil Type</p>
                <p className="font-medium">
                  {field.soilType ? SOIL_TYPE_LABELS[field.soilType] : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">pH</p>
                <p className="font-medium">
                  {field.pH !== undefined ? field.pH.toFixed(1) : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Organic Matter</p>
                <p className="font-medium">
                  {field.organicMatter !== undefined ? `${field.organicMatter}%` : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">CEC</p>
                <p className="font-medium">
                  {field.cec !== undefined ? field.cec : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Crop History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Crop History</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldCropHistory
              fieldId={field.id}
              fieldAssignments={fieldAssignments}
              seasons={seasons}
            />
          </CardContent>
        </Card>

        {/* Notes */}
        {field.notes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{field.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <FieldEditModal
          field={field}
          existingFarms={existingFarms}
          onSave={handleSave}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};
