import { Droplet, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WaterQuality } from '@/types/chemicalData';

interface WaterQualityCardProps {
  waterQuality?: WaterQuality;
}

export function WaterQualityCard({ waterQuality }: WaterQualityCardProps) {
  const hasPH = waterQuality?.phMin || waterQuality?.phMax || waterQuality?.phOptimal;
  const hasHardness = waterQuality?.hardnessMax;
  const hasNotes = waterQuality?.notes;
  
  const hasData = hasPH || hasHardness || hasNotes;

  // Format pH range display
  const formatPHRange = () => {
    if (waterQuality?.phOptimal) {
      return `${waterQuality.phOptimal} (optimal)`;
    }
    if (waterQuality?.phMin && waterQuality?.phMax) {
      return `${waterQuality.phMin} - ${waterQuality.phMax}`;
    }
    if (waterQuality?.phMin) {
      return `≥ ${waterQuality.phMin}`;
    }
    if (waterQuality?.phMax) {
      return `≤ ${waterQuality.phMax}`;
    }
    return 'Not specified';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Droplet className="h-4 w-4" />
          Water Quality
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">
            No specific water quality requirements specified.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead>If Outside Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">pH</TableCell>
                  <TableCell>{formatPHRange()}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {hasPH ? 'Buffer spray solution' : '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Hardness</TableCell>
                  <TableCell>
                    {hasHardness ? `≤ ${waterQuality?.hardnessMax} ppm` : 'Not specified'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    Use AMS if hard water
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            {hasNotes && (
              <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {waterQuality?.notes}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
