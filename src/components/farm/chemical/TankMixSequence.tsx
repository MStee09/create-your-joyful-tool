import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MixingOrder } from '@/types/chemicalData';
import { cn } from '@/lib/utils';

// Standard 8-step tank mix sequence
const TANK_MIX_STEPS = [
  { step: 1, category: 'water-conditioner', description: 'Water conditioners (AMS)' },
  { step: 2, category: 'inductor', description: 'Inductor products (rinse after each)' },
  { step: 3, category: 'pva-bag', description: 'Products in PVA bags' },
  { step: 4, category: 'dry-flowable', description: 'Water-dispersible products (DF, WDG, SC)' },
  { step: 5, category: 'solution', description: 'Water-soluble products (SL)' },
  { step: 6, category: 'emulsifiable-concentrate', description: 'Emulsifiable concentrates (EC)' },
  { step: 7, category: 'surfactant', description: 'Surfactants, oils, adjuvants' },
  { step: 8, category: 'drift-retardant', description: 'Drift retardants' },
];

// Map formulation types to step positions
function getStepForFormulation(formulationType?: string, mixingOrder?: MixingOrder): number | null {
  if (mixingOrder?.priority) {
    // Map priority to step (priority 1 = step 1, etc., but some need adjustment)
    const priority = mixingOrder.priority;
    if (priority <= 2) return priority;
    if (priority === 3 || priority === 4 || priority === 5) return 4; // Dry flowables/suspensions
    if (priority === 6) return 6; // EC
    if (priority === 7) return 5; // Solutions
    if (priority === 8) return 7; // Surfactants
    if (priority === 9) return 8; // Drift retardants
    return priority;
  }
  
  if (!formulationType) return null;
  
  const ft = formulationType.toUpperCase();
  if (ft === 'EC') return 6;
  if (['SC', 'F', 'L', 'WDG', 'DF', 'WP'].includes(ft)) return 4;
  if (['SL', 'S'].includes(ft)) return 5;
  
  return null;
}

interface TankMixSequenceProps {
  productName?: string;
  formulationType?: string;
  mixingOrder?: MixingOrder;
}

export function TankMixSequence({ productName, formulationType, mixingOrder }: TankMixSequenceProps) {
  const activeStep = getStepForFormulation(formulationType, mixingOrder);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Tank Mix Sequence</CardTitle>
        <p className="text-sm text-muted-foreground">
          Fill tank ¾ with water, then add products in this order:
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Step</TableHead>
              <TableHead>Add</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TANK_MIX_STEPS.map((step) => {
              const isActive = step.step === activeStep;
              
              return (
                <TableRow 
                  key={step.step}
                  className={cn(
                    isActive && "bg-primary/10 font-medium"
                  )}
                >
                  <TableCell className="font-mono">
                    <span className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}>
                      {isActive ? (
                        <ArrowRight className="h-4 w-4" />
                      ) : (
                        step.step
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    {isActive ? (
                      <span className="text-primary font-semibold">
                        {productName || 'THIS PRODUCT'} ({formulationType || mixingOrder?.category?.toUpperCase()})
                      </span>
                    ) : (
                      <span className={cn(isActive && "text-primary")}>
                        {step.description}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {mixingOrder?.notes && (
          <p className="mt-3 text-sm text-muted-foreground italic">
            {mixingOrder.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
