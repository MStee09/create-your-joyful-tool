import React, { useState, useMemo } from 'react';
import { Plus, Upload, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Field, FieldAssignment, SoilType } from '@/types/field';
import { SOIL_TYPE_LABELS, SOIL_TYPES } from '@/types/field';
import type { Season } from '@/types';
import { FieldEditModal } from './FieldEditModal';
import { FieldImportModal } from './FieldImportModal';

interface FieldsListViewProps {
  fields: Field[];
  fieldAssignments: FieldAssignment[];
  seasons: Season[];
  onSelectField: (fieldId: string) => void;
  onAddField: (field: Field) => Promise<void>;
  onUpdateField: (field: Field) => Promise<void>;
  onAddFields: (fields: Field[]) => Promise<void>;
}

export const FieldsListView: React.FC<FieldsListViewProps> = ({
  fields,
  fieldAssignments,
  seasons,
  onSelectField,
  onAddField,
  onUpdateField,
  onAddFields,
}) => {
  const [search, setSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState<string>('all');
  const [soilFilter, setSoilFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Get unique farms for filter dropdown
  const farms = useMemo(() => {
    const farmSet = new Set(fields.map(f => f.farm).filter(Boolean) as string[]);
    return Array.from(farmSet).sort();
  }, [fields]);

  // Filter fields
  const filteredFields = useMemo(() => {
    return fields.filter(field => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !field.name.toLowerCase().includes(searchLower) &&
          !(field.farm?.toLowerCase().includes(searchLower))
        ) {
          return false;
        }
      }
      // Farm filter
      if (farmFilter !== 'all' && field.farm !== farmFilter) {
        return false;
      }
      // Soil filter
      if (soilFilter !== 'all' && field.soilType !== soilFilter) {
        return false;
      }
      return true;
    });
  }, [fields, search, farmFilter, soilFilter]);

  // Total acres
  const totalAcres = useMemo(() => {
    return filteredFields.reduce((sum, f) => sum + f.acres, 0);
  }, [filteredFields]);

  const handleAddField = async (field: Field) => {
    await onAddField(field);
    setShowAddModal(false);
  };

  const handleImportFields = async (importedFields: Field[]) => {
    await onAddFields(importedFields);
    setShowImportModal(false);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Fields</h2>
          <p className="text-muted-foreground mt-1">Manage your farm fields and soil data</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={farmFilter} onValueChange={setFarmFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Farms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Farms</SelectItem>
            {farms.map(farm => (
              <SelectItem key={farm} value={farm}>{farm}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={soilFilter} onValueChange={setSoilFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Soil Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Soil Types</SelectItem>
            {SOIL_TYPES.map(type => (
              <SelectItem key={type} value={type}>{SOIL_TYPE_LABELS[type]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredFields.length > 0 ? (
        <div className="bg-card rounded-xl shadow-sm border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field Name</TableHead>
                <TableHead>Farm</TableHead>
                <TableHead className="text-right">Acres</TableHead>
                <TableHead>Soil Type</TableHead>
                <TableHead className="text-right">pH</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFields.map(field => (
                <TableRow
                  key={field.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectField(field.id)}
                >
                  <TableCell className="font-medium">{field.name}</TableCell>
                  <TableCell className="text-muted-foreground">{field.farm || '—'}</TableCell>
                  <TableCell className="text-right">{field.acres.toLocaleString()}</TableCell>
                  <TableCell>
                    {field.soilType ? SOIL_TYPE_LABELS[field.soilType] : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {field.pH !== undefined ? field.pH.toFixed(1) : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {/* Total row */}
              <TableRow className="bg-muted/30 font-medium">
                <TableCell>Total</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right">{totalAcres.toLocaleString()} ac</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border p-12 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">No Fields</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Add your first field to start tracking soil data and crop history.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import from CSV
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <FieldEditModal
          existingFarms={farms}
          onSave={handleAddField}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showImportModal && (
        <FieldImportModal
          onImport={handleImportFields}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
};
