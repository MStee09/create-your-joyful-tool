import { AlertTriangle, Ban, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CropMixingWarning } from '@/types/chemicalData';
import { cn } from '@/lib/utils';

// Crop emoji mapping for visual scanning
const CROP_EMOJIS: Record<string, string> = {
  'corn': '🌽',
  'cotton': '🥜',
  'dry bean': '🫘',
  'soybean': '🫛',
  'wheat': '🌾',
  'barley': '🌾',
  'oats': '🌾',
  'sorghum': '🌾',
  'sunflower': '🌻',
  'canola': '🥬',
  'peanut': '🥜',
  'sugarbeet': '🥬',
  'potato': '🥔',
  'onion': '🧅',
  'squash': '🎃',
  'winter squash': '🎃',
  'pumpkin': '🎃',
  'hops': '🍺',
  'grass': '🌿',
  'perennial grass': '🌿',
  'alfalfa': '🌿',
};

function getCropEmoji(crop: string): string {
  const cropLower = crop.toLowerCase();
  for (const [key, emoji] of Object.entries(CROP_EMOJIS)) {
    if (cropLower.includes(key)) {
      return emoji;
    }
  }
  return '🌱'; // Default plant emoji
}

function getSeverityConfig(severity: CropMixingWarning['severity']) {
  switch (severity) {
    case 'prohibited':
      return {
        icon: Ban,
        bgClass: 'bg-destructive/10 border-destructive/30',
        badgeClass: 'bg-destructive text-destructive-foreground',
        iconClass: 'text-destructive',
        label: 'Prohibited',
      };
    case 'avoid':
      return {
        icon: AlertTriangle,
        bgClass: 'bg-orange-500/10 border-orange-500/30',
        badgeClass: 'bg-orange-500 text-white',
        iconClass: 'text-orange-600',
        label: 'Avoid',
      };
    case 'caution':
    default:
      return {
        icon: Info,
        bgClass: 'bg-amber-500/10 border-amber-500/30',
        badgeClass: 'bg-amber-500 text-white',
        iconClass: 'text-amber-600',
        label: 'Caution',
      };
  }
}

interface CropMixingWarningsProps {
  warnings?: CropMixingWarning[];
}

export function CropMixingWarnings({ warnings }: CropMixingWarningsProps) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Crop-Specific Mixing Warnings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {warnings.map((warning, index) => {
          const config = getSeverityConfig(warning.severity);
          const Icon = config.icon;
          const emoji = getCropEmoji(warning.crop);
          
          return (
            <div 
              key={index}
              className={cn(
                "p-3 rounded-lg border",
                config.bgClass
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm uppercase">
                      {warning.crop}
                    </span>
                    <Badge className={cn("text-xs", config.badgeClass)}>
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {warning.warning}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
