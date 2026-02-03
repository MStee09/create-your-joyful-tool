import { AlertTriangle, XCircle, TestTube } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Compatibility } from '@/types/chemicalData';

interface PreMixChecklistProps {
  compatibility?: Compatibility;
  productName?: string;
}

export function PreMixChecklist({ compatibility, productName }: PreMixChecklistProps) {
  const jarTest = compatibility?.jarTest;
  const incompatible = compatibility?.incompatible || [];
  const antagonists = compatibility?.antagonists || [];
  const cautionWith = compatibility?.cautionWith || [];
  
  // Combine antagonists and cautionWith for CAUTION section
  const cautionItems = [...new Set([...antagonists, ...cautionWith])];
  
  const hasContent = jarTest || incompatible.length > 0 || cautionItems.length > 0;
  
  if (!hasContent) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Pre-Mix Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No specific mixing warnings for {productName || 'this product'}. Always conduct a jar test when tank mixing for the first time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TestTube className="h-4 w-4" />
          Pre-Mix Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Jar Test Warning */}
        {jarTest && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                JAR TEST RECOMMENDED
              </p>
              <p className="text-sm text-muted-foreground">
                Before tank mixing, conduct a jar test to check physical compatibility
              </p>
            </div>
          </div>
        )}
        
        {/* DO NOT MIX - Incompatible */}
        {incompatible.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  DO NOT MIX WITH:
                </p>
                <ul className="space-y-1">
                  {incompatible.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* CAUTION - May cause issues */}
        {cautionItems.length > 0 && (
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                  CAUTION - May increase crop injury:
                </p>
                <ul className="space-y-1">
                  {cautionItems.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
