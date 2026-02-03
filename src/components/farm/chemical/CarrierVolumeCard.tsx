import { Droplets } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CarrierVolume, ApplicationRequirements } from '@/types/chemicalData';

interface CarrierVolumeCardProps {
  carrierVolume?: CarrierVolume;
  applicationRequirements?: ApplicationRequirements;
}

export function CarrierVolumeCard({ carrierVolume, applicationRequirements }: CarrierVolumeCardProps) {
  // Combine data from both sources
  const aerialMin = carrierVolume?.aerialMin || applicationRequirements?.carrierGpaMinAerial;
  const groundMin = carrierVolume?.groundMin || applicationRequirements?.carrierGpaMinGround;
  const chemigationRange = carrierVolume?.chemigationRange;
  const notes = carrierVolume?.notes || applicationRequirements?.notes;
  
  const hasData = aerialMin || groundMin || chemigationRange;
  
  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            Carrier Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No specific carrier volume requirements specified. Follow standard application practices.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Droplets className="h-4 w-4" />
          Carrier Volume
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application Method</TableHead>
              <TableHead>Minimum Volume</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aerialMin && (
              <TableRow>
                <TableCell className="font-medium">Aerial</TableCell>
                <TableCell>{aerialMin} gal/ac</TableCell>
                <TableCell className="text-muted-foreground">Adequate for uniform distribution</TableCell>
              </TableRow>
            )}
            {groundMin && (
              <TableRow>
                <TableCell className="font-medium">Ground Broadcast</TableCell>
                <TableCell>{groundMin} gal/ac</TableCell>
                <TableCell className="text-muted-foreground">Adequate for uniform distribution</TableCell>
              </TableRow>
            )}
            {chemigationRange && (
              <TableRow>
                <TableCell className="font-medium">Chemigation</TableCell>
                <TableCell>{chemigationRange}</TableCell>
                <TableCell className="text-muted-foreground">Lower rate for coarse soils</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        
        {notes && (
          <p className="mt-3 text-sm text-muted-foreground italic">
            {notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
