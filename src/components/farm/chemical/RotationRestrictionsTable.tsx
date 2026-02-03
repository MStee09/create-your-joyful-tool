import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { RotationRestriction } from '@/types/chemicalData';

interface RotationRestrictionsTableProps {
  restrictions: RotationRestriction[];
  editable?: boolean;
  onChange?: (restrictions: RotationRestriction[]) => void;
}

export function RotationRestrictionsTable({ 
  restrictions, 
  editable = false, 
  onChange 
}: RotationRestrictionsTableProps) {
  const handleAdd = () => {
    if (!onChange) return;
    onChange([...restrictions, { crop: '', days: undefined, months: undefined, intervalUnit: 'days' }]);
  };

  const handleRemove = (index: number) => {
    if (!onChange) return;
    onChange(restrictions.filter((_, i) => i !== index));
  };

  const handleChange = <K extends keyof RotationRestriction>(
    index: number, 
    field: K, 
    value: RotationRestriction[K]
  ) => {
    if (!onChange) return;
    const updated = [...restrictions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const formatInterval = (restriction: RotationRestriction): string => {
    if (restriction.months !== undefined) {
      return `${restriction.months} month${restriction.months !== 1 ? 's' : ''}`;
    }
    if (restriction.days !== undefined) {
      return `${restriction.days} day${restriction.days !== 1 ? 's' : ''}`;
    }
    return '—';
  };

  if (restrictions.length === 0 && !editable) {
    return (
      <p className="text-sm text-muted-foreground italic">No rotation restrictions specified</p>
    );
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Crop</TableHead>
            <TableHead>Interval</TableHead>
            <TableHead>Conditions</TableHead>
            <TableHead>Notes</TableHead>
            {editable && <TableHead className="w-12"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {restrictions.map((restriction, index) => (
            <TableRow key={index}>
              <TableCell>
                {editable ? (
                  <Input
                    value={restriction.crop}
                    onChange={(e) => handleChange(index, 'crop', e.target.value)}
                    placeholder="e.g., Corn"
                    className="h-8 w-32"
                  />
                ) : (
                  <span className="font-medium">{restriction.crop}</span>
                )}
              </TableCell>
              <TableCell>
                {editable ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={restriction.intervalUnit === 'months' 
                        ? (restriction.months ?? '') 
                        : (restriction.days ?? '')}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        if (restriction.intervalUnit === 'months') {
                          handleChange(index, 'months', val);
                        } else {
                          handleChange(index, 'days', val);
                        }
                      }}
                      placeholder="0"
                      className="h-8 w-16"
                      min={0}
                    />
                    <Select
                      value={restriction.intervalUnit || 'days'}
                      onValueChange={(value) => handleChange(index, 'intervalUnit', value as 'days' | 'months')}
                    >
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Badge variant="outline">{formatInterval(restriction)}</Badge>
                )}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Input
                    value={restriction.conditions || ''}
                    onChange={(e) => handleChange(index, 'conditions', e.target.value)}
                    placeholder="e.g., If no rainfall..."
                    className="h-8"
                  />
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {restriction.conditions || '—'}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Input
                    value={restriction.notes || ''}
                    onChange={(e) => handleChange(index, 'notes', e.target.value)}
                    placeholder="Notes"
                    className="h-8"
                  />
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {restriction.notes || '—'}
                  </span>
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
          Add Rotation Restriction
        </Button>
      )}
    </div>
  );
}
