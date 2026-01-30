import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CropType } from '@/types/farm';
import { CROP_TYPE_LABELS, normalizeCropType } from '@/lib/growthStages';

interface CropTypeSelectorProps {
  value?: CropType;
  onChange: (cropType: CropType) => void;
  className?: string;
}

export const CropTypeSelector: React.FC<CropTypeSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  // Normalize legacy crop types for display
  const normalizedValue = value ? normalizeCropType(value) : '';
  
  return (
    <Select value={normalizedValue} onValueChange={(v) => onChange(v as CropType)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select crop type" />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(CROP_TYPE_LABELS) as CropType[]).map((type) => (
          <SelectItem key={type} value={type}>
            {CROP_TYPE_LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
