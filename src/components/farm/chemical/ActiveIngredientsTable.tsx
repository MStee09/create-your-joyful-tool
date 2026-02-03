import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { ActiveIngredient } from '@/types/chemicalData';

interface ActiveIngredientsTableProps {
  ingredients: ActiveIngredient[];
  editable?: boolean;
  onChange?: (ingredients: ActiveIngredient[]) => void;
}

export function ActiveIngredientsTable({ 
  ingredients, 
  editable = false, 
  onChange 
}: ActiveIngredientsTableProps) {
  const handleAdd = () => {
    if (!onChange) return;
    onChange([...ingredients, { name: '', concentration: '', moaGroup: '' }]);
  };

  const handleRemove = (index: number) => {
    if (!onChange) return;
    onChange(ingredients.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof ActiveIngredient, value: string) => {
    if (!onChange) return;
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  if (ingredients.length === 0 && !editable) {
    return (
      <p className="text-sm text-muted-foreground italic">No active ingredients listed</p>
    );
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Active Ingredient</TableHead>
            <TableHead>Concentration</TableHead>
            <TableHead>MOA Group</TableHead>
            <TableHead>Chemical Class</TableHead>
            {editable && <TableHead className="w-12"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ingredients.map((ai, index) => (
            <TableRow key={index}>
              <TableCell>
                {editable ? (
                  <Input
                    value={ai.name}
                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                    placeholder="e.g., Glyphosate"
                    className="h-8"
                  />
                ) : (
                  <span className="font-medium">{ai.name}</span>
                )}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Input
                    value={ai.concentration || ''}
                    onChange={(e) => handleChange(index, 'concentration', e.target.value)}
                    placeholder="e.g., 41%"
                    className="h-8 w-24"
                  />
                ) : (
                  ai.concentration || '—'
                )}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Input
                    value={ai.moaGroup || ''}
                    onChange={(e) => handleChange(index, 'moaGroup', e.target.value)}
                    placeholder="e.g., Group 9"
                    className="h-8 w-24"
                  />
                ) : ai.moaGroup ? (
                  <Badge variant="outline" className="font-mono">
                    {ai.moaGroup}
                  </Badge>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                {editable ? (
                  <Input
                    value={ai.chemicalClass || ''}
                    onChange={(e) => handleChange(index, 'chemicalClass', e.target.value)}
                    placeholder="e.g., Glycine"
                    className="h-8"
                  />
                ) : (
                  ai.chemicalClass || '—'
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
          Add Ingredient
        </Button>
      )}
    </div>
  );
}
