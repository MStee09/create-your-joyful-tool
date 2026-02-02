import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Beaker, Edit2 } from 'lucide-react';
import { formatNumber, formatCurrency } from '@/utils/farmUtils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import type { Crop } from '@/types/farm';
import type { ProductMaster, PriceBookEntry } from '@/types';
import type { Field, FieldAssignment, FieldCropOverride, FieldAssignmentExtended } from '@/types/field';
import type { PriceBookContext } from '@/lib/cropCalculations';
import { 
  calculateFieldEffectiveApplications, 
  calculateFieldCostPerAcre, 
  calculateFieldNutrients,
  calculateCropWeightedAverage,
  calculateVarianceFromAverage,
  getOverrideSummaryText 
} from '@/lib/fieldPlanCalculations';
import { FieldOverrideEditor } from './FieldOverrideEditor';

interface CropByFieldViewProps {
  crop: Crop;
  fields: Field[];
  fieldAssignments: FieldAssignment[];
  fieldOverrides: FieldCropOverride[];
  productMasters: ProductMaster[];
  priceBook: PriceBookEntry[];
  seasonYear: number;
  onOpenMixCalculator?: (fieldId: string, acres: number) => void;
  onUpdateOverrides?: (overrides: FieldCropOverride[]) => void;
}

export const CropByFieldView: React.FC<CropByFieldViewProps> = ({
  crop,
  fields,
  fieldAssignments,
  fieldOverrides,
  productMasters,
  priceBook,
  seasonYear,
  onOpenMixCalculator,
  onUpdateOverrides,
}) => {
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);

  const priceBookContext: PriceBookContext = useMemo(() => ({
    productMasters,
    priceBook,
    seasonYear,
  }), [productMasters, priceBook, seasonYear]);

  // Build extended field assignments with calculations
  const extendedAssignments: FieldAssignmentExtended[] = useMemo(() => {
    const cropAssignments = fieldAssignments.filter(fa => fa.cropId === crop.id);
    
    return cropAssignments.map(fa => {
      const field = fields.find(f => f.id === fa.fieldId);
      const overrides = fieldOverrides.filter(o => o.fieldAssignmentId === fa.id);
      
      const effectiveApplications = calculateFieldEffectiveApplications(
        crop.applications,
        overrides,
        productMasters
      );
      
      const costPerAcre = calculateFieldCostPerAcre(
        effectiveApplications,
        productMasters,
        priceBookContext
      );
      
      const nutrients = calculateFieldNutrients(effectiveApplications, productMasters);
      
      return {
        ...fa,
        fieldName: field?.name || 'Unknown Field',
        farm: field?.farm,
        overrides,
        effectiveApplications,
        costPerAcre,
        nutrients,
      };
    });
  }, [crop, fields, fieldAssignments, fieldOverrides, productMasters, priceBookContext]);

  // Calculate crop averages
  const cropAverage = useMemo(() => ({
    costPerAcre: calculateCropWeightedAverage(extendedAssignments, 'cost'),
    n: calculateCropWeightedAverage(extendedAssignments, 'n'),
    p: calculateCropWeightedAverage(extendedAssignments, 'p'),
    k: calculateCropWeightedAverage(extendedAssignments, 'k'),
    s: calculateCropWeightedAverage(extendedAssignments, 's'),
    totalAcres: extendedAssignments.reduce((sum, fa) => sum + (fa.plannedAcres ?? fa.acres), 0),
  }), [extendedAssignments]);

  const toggleExpand = (fieldId: string) => {
    setExpandedFieldId(prev => prev === fieldId ? null : fieldId);
  };

  if (extendedAssignments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">No fields assigned to this crop</p>
        <p className="text-sm text-muted-foreground">
          Use "Assign Fields" to link fields to this crop plan
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Crop Average Summary */}
      <div className="bg-muted/30 rounded-xl p-4 border border-border">
        <div className="text-sm text-muted-foreground mb-1">
          CROP AVERAGE ({formatNumber(cropAverage.totalAcres, 0)} ac)
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>
            <span className="font-semibold text-foreground">{formatCurrency(cropAverage.costPerAcre)}</span>
            <span className="text-muted-foreground">/ac</span>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            N {formatNumber(cropAverage.n, 1)} | P {formatNumber(cropAverage.p, 1)} | K {formatNumber(cropAverage.k, 1)} | S {formatNumber(cropAverage.s, 1)}
          </span>
        </div>
      </div>

      {/* Field Rows */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-4">Field</div>
          <div className="col-span-2 text-right">Acres</div>
          <div className="col-span-2 text-right">$/ac</div>
          <div className="col-span-2 text-right">Var%</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Field Rows */}
        <div className="divide-y divide-border">
          {extendedAssignments.map(fa => {
            const isExpanded = expandedFieldId === fa.fieldId;
            const variance = calculateVarianceFromAverage(fa.costPerAcre || 0, cropAverage.costPerAcre);
            const overrideSummary = getOverrideSummaryText(fa.overrides, crop.applications, productMasters);

            return (
              <Collapsible key={fa.id} open={isExpanded}>
                <div>
                  <CollapsibleTrigger asChild>
                    <button
                      className="w-full grid grid-cols-12 gap-2 px-4 py-3 hover:bg-muted/30 transition-colors items-center text-left"
                      onClick={() => toggleExpand(fa.fieldId)}
                    >
                      <div className="col-span-4 flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-medium text-foreground">{fa.fieldName}</div>
                          {fa.farm && (
                            <div className="text-xs text-muted-foreground">{fa.farm}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-span-2 text-right text-muted-foreground">
                        {formatNumber(fa.plannedAcres ?? fa.acres, 0)}
                      </div>
                      
                      <div className="col-span-2 text-right font-medium text-foreground">
                        {formatCurrency(fa.costPerAcre || 0)}
                      </div>
                      
                      <div className={`col-span-2 text-right font-medium ${
                        variance > 5 ? 'text-amber-600' : 
                        variance < -5 ? 'text-emerald-600' : 
                        'text-muted-foreground'
                      }`}>
                        {variance >= 0 ? '+' : ''}{formatNumber(variance, 1)}%
                      </div>
                      
                      <div className="col-span-2 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        {onOpenMixCalculator && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => onOpenMixCalculator(fa.fieldId, fa.plannedAcres ?? fa.acres)}
                            title="Open Mix Calculator"
                          >
                            <Beaker className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleExpand(fa.fieldId)}
                          title="Edit Overrides"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  {/* Override Summary (if any) */}
                  {overrideSummary && !isExpanded && (
                    <div className="px-4 pb-2 pl-10">
                      <span className="text-xs text-muted-foreground">└─ {overrideSummary}</span>
                    </div>
                  )}

                  {/* Expanded Override Editor */}
                  <CollapsibleContent>
                    <div className="border-t border-border bg-muted/20 p-4">
                      <FieldOverrideEditor
                        fieldAssignment={fa}
                        crop={crop}
                        productMasters={productMasters}
                        overrides={fa.overrides}
                        onUpdateOverrides={onUpdateOverrides}
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </div>
  );
};
