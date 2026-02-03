import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Shield, 
  Droplets, 
  Beaker,
  AlertTriangle,
  Factory,
  ExternalLink,
} from 'lucide-react';
import { ActiveIngredientsTable } from './ActiveIngredientsTable';
import type { ProductMaster, VendorOffering, Vendor } from '@/types';
import type { ChemicalData } from '@/types/chemicalData';
import { SIGNAL_WORD_LABELS, FORMULATION_TYPES, ADJUVANT_TYPE_LABELS } from '@/types/chemicalData';
import { formatCurrency } from '@/lib/calculations';

interface ChemicalProductOverviewTabProps {
  product: ProductMaster;
  chemicalData: ChemicalData | undefined;
  vendorOfferings: VendorOffering[];
  vendors: Vendor[];
  onNavigateToVendor?: (vendorId: string) => void;
}

export function ChemicalProductOverviewTab({
  product,
  chemicalData,
  vendorOfferings,
  vendors,
  onNavigateToVendor,
}: ChemicalProductOverviewTabProps) {
  const data = chemicalData || {};
  const restrictions = data.restrictions || {};
  const preferredOffering = vendorOfferings.find(o => o.isPreferred) || vendorOfferings[0];
  const preferredVendor = preferredOffering ? vendors.find(v => v.id === preferredOffering.vendorId) : null;

  // Quick reference cards
  const quickRefs = [
    { 
      label: 'PHI', 
      value: restrictions.phiDays !== undefined ? `${restrictions.phiDays} days` : null,
      icon: Clock,
      color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    },
    { 
      label: 'REI', 
      value: restrictions.reiHours !== undefined ? `${restrictions.reiHours} hrs` : null,
      icon: Shield,
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    },
    { 
      label: 'Max/App', 
      value: restrictions.maxRatePerApplication 
        ? `${restrictions.maxRatePerApplication.value} ${restrictions.maxRatePerApplication.unit}` 
        : null,
      icon: Droplets,
      color: 'bg-muted',
    },
    { 
      label: 'Max/Season', 
      value: restrictions.maxRatePerSeason 
        ? `${restrictions.maxRatePerSeason.value} ${restrictions.maxRatePerSeason.unit}` 
        : null,
      icon: Beaker,
      color: 'bg-muted',
    },
    { 
      label: 'Max Apps', 
      value: restrictions.maxApplicationsPerSeason ? `${restrictions.maxApplicationsPerSeason}x` : null,
      icon: Shield,
      color: 'bg-muted',
    },
  ].filter(r => r.value);

  // Get primary adjuvant requirement
  const primaryAdjuvant = data.adjuvantRequirements?.find(a => a.isRequired) 
    || data.adjuvantRequirements?.[0];

  return (
    <div className="space-y-6">
      {/* Manufacturer & Regulatory Info */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Factory className="w-4 h-4" />
            Manufacturer & Regulatory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {product.manufacturer && (
              <div>
                <span className="text-xs text-muted-foreground uppercase">Manufacturer</span>
                <div className="font-medium flex items-center gap-2">
                  {product.manufacturer}
                  {product.manufacturerWebsite && (
                    <a 
                      href={product.manufacturerWebsite} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
            {data.epaRegNumber && (
              <div>
                <span className="text-xs text-muted-foreground uppercase">EPA Reg. No.</span>
                <div className="font-mono font-medium">{data.epaRegNumber}</div>
              </div>
            )}
            {data.signalWord && (
              <Badge 
                variant={data.signalWord === 'danger' ? 'destructive' : 'secondary'}
                className="uppercase"
              >
                {SIGNAL_WORD_LABELS[data.signalWord]}
              </Badge>
            )}
            {data.formulationType && (
              <Badge variant="outline">
                {FORMULATION_TYPES.find(f => f.code === data.formulationType)?.name || data.formulationType}
              </Badge>
            )}
          </div>
          {!product.manufacturer && !data.epaRegNumber && (
            <p className="text-sm text-muted-foreground italic">No manufacturer or regulatory info recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Reference Cards */}
      {quickRefs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {quickRefs.map((ref, i) => (
            <div key={i} className={`p-3 rounded-lg ${ref.color}`}>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase mb-1">
                <ref.icon className="w-3 h-3" />
                {ref.label}
              </div>
              <div className="text-lg font-semibold">{ref.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Active Ingredients */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Active Ingredients</CardTitle>
          <CardDescription>Chemical compounds and MOA groups</CardDescription>
        </CardHeader>
        <CardContent>
          <ActiveIngredientsTable 
            ingredients={data.activeIngredients || []} 
            editable={false} 
          />
        </CardContent>
      </Card>

      {/* Rate & Adjuvant Summary */}
      {(data.rateRange || primaryAdjuvant) && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Application Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.rateRange && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase mb-1">Rate Range</div>
                  <div className="font-medium">
                    {data.rateRange.min && data.rateRange.max ? (
                      <>
                        {data.rateRange.min} - {data.rateRange.max} {data.rateRange.unit}
                      </>
                    ) : data.rateRange.typical ? (
                      <>{data.rateRange.typical} {data.rateRange.unit}</>
                    ) : (
                      'Not specified'
                    )}
                  </div>
                  {data.rateRange.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{data.rateRange.notes}</p>
                  )}
                </div>
              )}
              {primaryAdjuvant && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-xs text-muted-foreground uppercase mb-1">
                    {primaryAdjuvant.isRequired ? 'Required' : 'Recommended'} Adjuvant
                  </div>
                  <div className="font-medium">
                    {ADJUVANT_TYPE_LABELS[primaryAdjuvant.type]}
                    {primaryAdjuvant.rate && ` @ ${primaryAdjuvant.rate}`}
                  </div>
                  {primaryAdjuvant.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{primaryAdjuvant.notes}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor & Pricing */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Vendors & Pricing</CardTitle>
          <CardDescription>{vendorOfferings.length} vendor offering(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {vendorOfferings.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              No vendor offerings configured
            </p>
          ) : (
            <div className="space-y-2">
              {vendorOfferings.map(offering => {
                const vendor = vendors.find(v => v.id === offering.vendorId);
                return (
                  <div 
                    key={offering.id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {offering.isPreferred && (
                        <Badge variant="default" className="text-xs">Preferred</Badge>
                      )}
                      <button
                        onClick={() => vendor && onNavigateToVendor?.(vendor.id)}
                        className="font-medium hover:underline text-left"
                      >
                        {vendor?.name || 'Unknown Vendor'}
                      </button>
                      {offering.packaging && (
                        <span className="text-sm text-muted-foreground">· {offering.packaging}</span>
                      )}
                    </div>
                    <div className="font-medium">
                      {formatCurrency(offering.price)}/{offering.priceUnit}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
