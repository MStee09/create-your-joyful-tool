// ============================================================================
// Field Comparison View - Phase 2
// Compare costs, nutrients, and history across fields with same crop
// ============================================================================

import React, { useMemo, useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Leaf, DollarSign, Droplets, MapPin, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { SOIL_TYPE_LABELS } from '@/types/field';
import type { Field, FieldAssignment, SoilType } from '@/types/field';
import type { Season, Crop, Product, ProductMaster, PriceBookEntry } from '@/types';
import { calculateFieldData, groupFieldsByCrop, calculateVariance, type FieldComparisonData, type CropGroup } from '@/lib/fieldComparisonUtils';

interface FieldComparisonViewProps {
  fields: Field[];
  fieldAssignments: FieldAssignment[];
  seasons: Season[];
  currentSeason: Season | null;
  products: Product[];
  productMasters: ProductMaster[];
  priceBook: PriceBookEntry[];
  onSelectField: (fieldId: string) => void;
  onBack: () => void;
}

export const FieldComparisonView: React.FC<FieldComparisonViewProps> = ({
  fields,
  fieldAssignments,
  seasons,
  currentSeason,
  products,
  productMasters,
  priceBook,
  onSelectField,
  onBack,
}) => {
  const [selectedCropId, setSelectedCropId] = useState<string>('all');

  // Get current season assignments
  const currentAssignments = useMemo(() => {
    if (!currentSeason) return [];
    return fieldAssignments.filter(fa => fa.seasonId === currentSeason.id);
  }, [fieldAssignments, currentSeason]);

  // Get crops from current season
  const crops = useMemo(() => {
    if (!currentSeason?.crops) return [];
    return currentSeason.crops as Crop[];
  }, [currentSeason]);

  // Calculate field data for all assigned fields
  const fieldData = useMemo((): FieldComparisonData[] => {
    if (!currentSeason) return [];
    
    return fields
      .map(field => {
        const assignment = currentAssignments.find(a => a.fieldId === field.id);
        const crop = assignment ? crops.find(c => c.id === assignment.cropId) : null;
        
        return calculateFieldData(
          field,
          assignment || null,
          crop || null,
          products,
          productMasters,
          priceBook,
          currentSeason.year
        );
      })
      .filter(fd => fd.cropId); // Only show assigned fields
  }, [fields, currentAssignments, crops, products, productMasters, priceBook, currentSeason]);

  // Group by crop
  const cropGroups = useMemo(() => {
    return groupFieldsByCrop(fieldData);
  }, [fieldData]);

  // Filter by selected crop
  const filteredGroups = useMemo(() => {
    if (selectedCropId === 'all') return cropGroups;
    return cropGroups.filter(g => g.cropId === selectedCropId);
  }, [cropGroups, selectedCropId]);

  // Summary stats
  const summary = useMemo(() => {
    const totalAcres = filteredGroups.reduce((sum, g) => sum + g.totalAcres, 0);
    const totalCost = filteredGroups.reduce((sum, g) => sum + g.totalCost, 0);
    const fieldCount = filteredGroups.reduce((sum, g) => sum + g.fields.length, 0);
    
    return {
      totalAcres,
      totalCost,
      avgCostPerAcre: totalAcres > 0 ? totalCost / totalAcres : 0,
      fieldCount,
    };
  }, [filteredGroups]);

  if (!currentSeason) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground py-12">
          No season selected. Please select a season to compare fields.
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Field Comparison</h2>
              <p className="text-muted-foreground">
                Compare costs and nutrients across fields · {currentSeason.year} {currentSeason.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCropId} onValueChange={setSelectedCropId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by crop" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Crops</SelectItem>
                {cropGroups.map(g => (
                  <SelectItem key={g.cropId} value={g.cropId}>
                    {g.cropName} ({g.fields.length} fields)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Fields Compared</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.fieldCount}</div>
              <p className="text-xs text-muted-foreground">
                {filteredGroups.length} crop{filteredGroups.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Acres</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(summary.totalAcres, 0)} ac</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg $/Acre</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.avgCostPerAcre)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Cost</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Crop Groups */}
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No fields have been assigned to crops this season.
              <br />
              <span className="text-sm">Assign fields to crops to see comparisons.</span>
            </CardContent>
          </Card>
        ) : (
          filteredGroups.map(group => (
            <CropGroupCard
              key={group.cropId}
              group={group}
              onSelectField={onSelectField}
            />
          ))
        )}
      </div>
    </TooltipProvider>
  );
};

// ============================================================================
// Crop Group Card Component
// ============================================================================

interface CropGroupCardProps {
  group: CropGroup;
  onSelectField: (fieldId: string) => void;
}

const CropGroupCard: React.FC<CropGroupCardProps> = ({ group, onSelectField }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <Leaf className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{group.cropName}</CardTitle>
              <CardDescription>
                {group.fields.length} field{group.fields.length !== 1 ? 's' : ''} · {formatNumber(group.totalAcres, 0)} ac
              </CardDescription>
            </div>
          </div>
          
          {/* Crop Average Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-right">
              <div className="text-muted-foreground">Avg $/ac</div>
              <div className="font-semibold">{formatCurrency(group.avgCostPerAcre)}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground">Total</div>
              <div className="font-semibold">{formatCurrency(group.totalCost)}</div>
            </div>
            <NutrientPills nutrients={group.avgNutrients} ratios={group.avgRatios} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Farm</TableHead>
              <TableHead>Soil</TableHead>
              <TableHead className="text-right">Acres</TableHead>
              <TableHead className="text-right">$/Acre</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead>Nutrients (lbs/ac)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.fields.map(fd => {
              const variance = calculateVariance(fd.costPerAcre, group.avgCostPerAcre);
              const acres = fd.assignment?.acres || fd.field.acres;
              
              return (
                <TableRow 
                  key={fd.field.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectField(fd.field.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{fd.field.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fd.field.farm || '—'}
                  </TableCell>
                  <TableCell>
                    {fd.field.soilType ? (
                      <Badge variant="outline" className="text-xs">
                        {SOIL_TYPE_LABELS[fd.field.soilType as SoilType] || fd.field.soilType}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(acres, 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(fd.costPerAcre)}
                  </TableCell>
                  <TableCell className="text-right">
                    <VarianceBadge variance={variance} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(fd.totalCost)}
                  </TableCell>
                  <TableCell>
                    <NutrientPillsCompact nutrients={fd.nutrients} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Helper Components
// ============================================================================

interface NutrientPillsProps {
  nutrients: { n: number; p: number; k: number; s: number };
  ratios?: { nToS: number | null; nToK: number | null };
}

const NutrientPills: React.FC<NutrientPillsProps> = ({ nutrients, ratios }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          N {formatNumber(nutrients.n, 0)}
        </span>
        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          P {formatNumber(nutrients.p, 0)}
        </span>
        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          K {formatNumber(nutrients.k, 0)}
        </span>
        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          S {formatNumber(nutrients.s, 0)}
        </span>
      </div>
      {ratios && (ratios.nToS !== null || ratios.nToK !== null) && (
        <div className="text-xs text-muted-foreground">
          {ratios.nToS !== null && <span>N:S {formatNumber(ratios.nToS, 1)}:1</span>}
          {ratios.nToS !== null && ratios.nToK !== null && <span className="mx-1">·</span>}
          {ratios.nToK !== null && <span>N:K {formatNumber(ratios.nToK, 1)}:1</span>}
        </div>
      )}
    </div>
  );
};

const NutrientPillsCompact: React.FC<{ nutrients: { n: number; p: number; k: number; s: number } }> = ({ nutrients }) => {
  return (
    <div className="flex items-center gap-1">
      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        N {formatNumber(nutrients.n, 0)}
      </span>
      {nutrients.s > 0.1 && (
        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          S {formatNumber(nutrients.s, 0)}
        </span>
      )}
      {nutrients.k > 0.1 && (
        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          K {formatNumber(nutrients.k, 0)}
        </span>
      )}
    </div>
  );
};

interface VarianceBadgeProps {
  variance: { amount: number; percentage: number; direction: 'over' | 'under' | 'even' };
}

const VarianceBadge: React.FC<VarianceBadgeProps> = ({ variance }) => {
  if (variance.direction === 'even') {
    return (
      <div className="flex items-center justify-end gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span className="text-xs">Avg</span>
      </div>
    );
  }

  const isOver = variance.direction === 'over';
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center justify-end gap-1 ${
          isOver ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
        }`}>
          {isOver ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span className="text-xs font-medium">
            {isOver ? '+' : ''}{formatNumber(variance.percentage, 0)}%
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{formatCurrency(Math.abs(variance.amount))}/ac {isOver ? 'over' : 'under'} crop average</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default FieldComparisonView;
