import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber } from '@/utils/farmUtils';
import type { Crop, Application, ApplicationTiming } from '@/types/farm';
import type { ProductMaster } from '@/types';
import type { FieldAssignment, FieldCropOverride, OverrideType } from '@/types/field';

interface FieldOverrideEditorProps {
  fieldAssignment: FieldAssignment;
  crop: Crop;
  productMasters: ProductMaster[];
  overrides: FieldCropOverride[];
  onUpdateOverrides?: (overrides: FieldCropOverride[]) => void;
}

const OVERRIDE_OPTIONS: { value: OverrideType | 'inherit'; label: string }[] = [
  { value: 'inherit', label: 'Inherit' },
  { value: 'rate_adjust', label: 'Adjust %' },
  { value: 'absolute', label: 'Set to' },
  { value: 'exclude', label: 'Exclude' },
];

export const FieldOverrideEditor: React.FC<FieldOverrideEditorProps> = ({
  fieldAssignment,
  crop,
  productMasters,
  overrides,
  onUpdateOverrides,
}) => {
  const [localOverrides, setLocalOverrides] = useState<FieldCropOverride[]>(overrides);

  // Group applications by timing
  const applicationsByTiming = React.useMemo(() => {
    const grouped = new Map<string, { timing: ApplicationTiming; applications: Application[] }>();
    
    for (const timing of crop.applicationTimings) {
      const apps = crop.applications.filter(a => a.timingId === timing.id);
      if (apps.length > 0) {
        grouped.set(timing.id, { timing, applications: apps });
      }
    }
    
    return grouped;
  }, [crop]);

  const getOverrideForApp = (appId: string): FieldCropOverride | undefined => {
    return localOverrides.find(o => o.applicationId === appId);
  };

  const updateOverride = (
    appId: string,
    overrideType: OverrideType | 'inherit',
    value?: number,
    unit?: string
  ) => {
    let newOverrides = [...localOverrides];
    const existingIdx = newOverrides.findIndex(o => o.applicationId === appId);
    
    if (overrideType === 'inherit') {
      // Remove override
      if (existingIdx >= 0) {
        newOverrides.splice(existingIdx, 1);
      }
    } else {
      const override: FieldCropOverride = {
        id: existingIdx >= 0 ? newOverrides[existingIdx].id : crypto.randomUUID(),
        fieldAssignmentId: fieldAssignment.id,
        applicationId: appId,
        overrideType,
        rateAdjustment: overrideType === 'rate_adjust' ? (value !== undefined ? 1 + value / 100 : undefined) : undefined,
        customRate: overrideType === 'absolute' || overrideType === 'add' ? value : undefined,
        customUnit: unit,
        createdAt: new Date().toISOString(),
      };
      
      if (existingIdx >= 0) {
        newOverrides[existingIdx] = override;
      } else {
        newOverrides.push(override);
      }
    }
    
    setLocalOverrides(newOverrides);
    onUpdateOverrides?.(newOverrides);
  };

  const getDisplayValue = (override: FieldCropOverride | undefined, baseRate: number): string => {
    if (!override) return '';
    
    if (override.overrideType === 'rate_adjust' && override.rateAdjustment !== undefined) {
      const pct = Math.round((override.rateAdjustment - 1) * 100);
      return pct.toString();
    }
    if (override.overrideType === 'absolute' && override.customRate !== undefined) {
      return override.customRate.toString();
    }
    return '';
  };

  const getEffectiveRate = (override: FieldCropOverride | undefined, baseRate: number): number => {
    if (!override) return baseRate;
    
    if (override.overrideType === 'exclude') return 0;
    if (override.overrideType === 'absolute' && override.customRate !== undefined) {
      return override.customRate;
    }
    if (override.overrideType === 'rate_adjust' && override.rateAdjustment !== undefined) {
      return baseRate * override.rateAdjustment;
    }
    return baseRate;
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-foreground">Rate Overrides</h4>
      
      {Array.from(applicationsByTiming.entries()).map(([timingId, { timing, applications }]) => (
        <div key={timingId} className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">{timing.name}</div>
          
          <div className="space-y-1 ml-3">
            {applications.map(app => {
              const product = productMasters.find(p => p.id === app.productId);
              if (!product) return null;
              
              const override = getOverrideForApp(app.id);
              const currentType = override?.overrideType || 'inherit';
              const effectiveRate = getEffectiveRate(override, app.rate);
              
              return (
                <div key={app.id} className="flex items-center gap-3 py-2">
                  <div className="w-40 truncate text-sm text-foreground">
                    {product.name}
                  </div>
                  
                  <div className="w-20 text-sm text-muted-foreground">
                    {formatNumber(app.rate, 2)} {app.rateUnit}
                  </div>
                  
                  <Select
                    value={currentType}
                    onValueChange={(value) => updateOverride(app.id, value as OverrideType | 'inherit')}
                  >
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OVERRIDE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Value input for rate_adjust and absolute */}
                  {(currentType === 'rate_adjust' || currentType === 'absolute') && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={getDisplayValue(override, app.rate)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            updateOverride(app.id, currentType, val, app.rateUnit);
                          }
                        }}
                        className="w-20 h-8"
                        placeholder={currentType === 'rate_adjust' ? '%' : 'rate'}
                      />
                      <span className="text-sm text-muted-foreground">
                        {currentType === 'rate_adjust' ? '%' : app.rateUnit}
                      </span>
                    </div>
                  )}
                  
                  {/* Show effective rate */}
                  {currentType !== 'inherit' && currentType !== 'exclude' && (
                    <div className="text-sm text-muted-foreground">
                      → {formatNumber(effectiveRate, 2)} {app.rateUnit}
                    </div>
                  )}
                  
                  {currentType === 'exclude' && (
                    <div className="flex items-center gap-1 text-sm text-red-500">
                      <X className="w-4 h-4" />
                      <span>Excluded</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Add Field-Only Product (simplified - full implementation would need product selector) */}
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => {
          // This would open a product selector modal in full implementation
          console.log('Add field-only product');
        }}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Field-Only Product
      </Button>
    </div>
  );
};
