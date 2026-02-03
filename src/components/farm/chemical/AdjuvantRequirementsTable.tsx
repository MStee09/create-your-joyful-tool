import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import { AdjuvantRequirement, AdjuvantType, ADJUVANT_TYPE_LABELS } from '@/types/chemicalData';

interface AdjuvantRequirementsTableProps {
  requirements: AdjuvantRequirement[];
  editable?: boolean;
  onChange?: (requirements: AdjuvantRequirement[]) => void;
}

const ADJUVANT_TYPES: AdjuvantType[] = [
  'MSO', 'COC', 'NIS', 'AMS', 'UAN', 
  'oil-adjuvant', 'surfactant', 'drift-retardant', 'water-conditioner', 'other'
];

export function AdjuvantRequirementsTable({ 
  requirements, 
  editable = false, 
  onChange 
}: AdjuvantRequirementsTableProps) {
  const handleAdd = () => {
    if (!onChange) return;
    onChange([...requirements, { type: 'NIS', isRequired: false, rate: '' }]);
  };

  const handleRemove = (index: number) => {
    if (!onChange) return;
    onChange(requirements.filter((_, i) => i !== index));
  };

  const handleChange = <K extends keyof AdjuvantRequirement>(
    index: number, 
    field: K, 
    value: AdjuvantRequirement[K]
  ) => {
    if (!onChange) return;
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  if (requirements.length === 0 && !editable) {
    return (
      <p className="text-sm text-muted-foreground italic">No adjuvant requirements specified</p>
    );
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Adjuvant Type</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Notes</TableHead>
            {editable && <TableHead className="w-12"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requirements.map((adj, index) => (
            <TableRow key={index}>
              <TableCell>
                {editable ? (
                  <Select
                    value={adj.type}
                    onValueChange={(value) => handleChange(index, 'type', value as AdjuvantType)}
                  >
                    <SelectTrigger className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADJUVANT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {ADJUVANT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="font-medium">{ADJUVANT_TYPE_LABELS[adj.type]}</span>
                )}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Switch
                    checked={adj.isRequired}
                    onCheckedChange={(checked) => handleChange(index, 'isRequired', checked)}
                  />
                ) : (
                  <Badge variant={adj.isRequired ? 'default' : 'secondary'}>
                    {adj.isRequired ? 'Required' : 'Recommended'}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Input
                    value={adj.rate || ''}
                    onChange={(e) => handleChange(index, 'rate', e.target.value)}
                    placeholder="e.g., 1 qt/ac"
                    className="h-8 w-28"
                  />
                ) : (
                  adj.rate || '—'
                )}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Input
                    value={adj.notes || ''}
                    onChange={(e) => handleChange(index, 'notes', e.target.value)}
                    placeholder="Optional notes"
                    className="h-8"
                  />
                ) : (
                  <span className="text-muted-foreground">{adj.notes || '—'}</span>
                )}
              </TableCell>
              {editable && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(index)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {editable && (
        <Button variant="outline" size="sm" onClick={handleAdd} className="mt-2">
          <Plus className="h-4 w-4 mr-1" />
          Add Adjuvant Requirement
        </Button>
      )}
    </div>
  );
}
