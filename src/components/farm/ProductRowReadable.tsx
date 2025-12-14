import React, { useState } from 'react';
import { MessageSquare, Edit3 } from 'lucide-react';
import type { Application, Product, LiquidUnit, DryUnit, Vendor } from '@/types/farm';
import type { ProductPurpose, ProductRole, ApplicationOverride } from '@/types/productIntelligence';
import { PRODUCT_ROLE_LABELS } from '@/types/productIntelligence';
import { formatCurrency, formatNumber, convertToGallons, convertToPounds } from '@/utils/farmUtils';
import { cn } from '@/lib/utils';

interface ProductRowReadableProps {
  application: Application;
  product: Product | undefined;
  vendor?: Vendor | null;
  totalAcres: number;
  acresPercentage: number;
  purpose?: ProductPurpose | null;
  override?: ApplicationOverride | null;
  onEdit: () => void;
  onUpdateOverride?: (override: ApplicationOverride) => void;
}

// Compact role chip colors
const ROLE_CHIP_STYLES: Record<string, string> = {
  'fertility-macro': 'bg-emerald-100 text-emerald-700',
  'fertility-micro': 'bg-teal-100 text-teal-700',
  'biostimulant': 'bg-purple-100 text-purple-700',
  'carbon-biology-food': 'bg-amber-100 text-amber-700',
  'stress-mitigation': 'bg-rose-100 text-rose-700',
  'uptake-translocation': 'bg-blue-100 text-blue-700',
  'nitrogen-conversion': 'bg-lime-100 text-lime-700',
  'rooting-vigor': 'bg-orange-100 text-orange-700',
  'water-conditioning': 'bg-sky-100 text-sky-700',
  'adjuvant': 'bg-slate-100 text-slate-700',
};

// Shortened role labels for chips
const SHORT_ROLE_LABELS: Record<ProductRole, string> = {
  'fertility-macro': 'Macro',
  'fertility-micro': 'Micro',
  'biostimulant': 'Biostim',
  'carbon-biology-food': 'Carbon',
  'stress-mitigation': 'Stress',
  'uptake-translocation': 'Uptake',
  'nitrogen-conversion': 'N-Eff',
  'rooting-vigor': 'Root',
  'water-conditioning': 'Water',
  'adjuvant': 'Adj',
};

export const ProductRowReadable: React.FC<ProductRowReadableProps> = ({
  application,
  product,
  vendor,
  totalAcres,
  acresPercentage,
  purpose,
  override,
  onEdit,
  onUpdateOverride,
}) => {
  const [isEditingWhyHere, setIsEditingWhyHere] = useState(false);
  const [whyHereValue, setWhyHereValue] = useState(override?.whyHere || '');

  if (!product) {
    return (
      <div className="px-4 py-3 bg-muted/30 rounded-lg text-muted-foreground text-sm">
        Product not found
      </div>
    );
  }

  // Calculate cost
  let costPerAcre = 0;
  if (product.form === 'liquid') {
    const gallonsPerAcre = convertToGallons(application.rate, application.rateUnit as LiquidUnit);
    costPerAcre = gallonsPerAcre * product.price;
  } else {
    const poundsPerAcre = convertToPounds(application.rate, application.rateUnit as DryUnit);
    const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
    costPerAcre = poundsPerAcre * pricePerPound;
  }

  const acresTreated = totalAcres * (acresPercentage / 100);
  const totalCost = costPerAcre * acresTreated;

  // Get roles from purpose or override
  const roles = override?.customRoles || purpose?.roles || [];
  const whyHere = override?.whyHere;

  // Visual weight based on acres percentage
  const getWeightOpacity = () => {
    if (acresPercentage >= 90) return 'opacity-100';
    if (acresPercentage >= 50) return 'opacity-85';
    if (acresPercentage >= 25) return 'opacity-70';
    return 'opacity-55';
  };
  
  // Bar height class based on acres
  const getBarHeightClass = () => {
    if (acresPercentage >= 90) return 'h-full';
    if (acresPercentage >= 60) return 'h-3/4';
    if (acresPercentage >= 40) return 'h-1/2';
    return 'h-1/4';
  };

  const handleSaveWhyHere = () => {
    if (onUpdateOverride) {
      onUpdateOverride({
        applicationId: application.id,
        whyHere: whyHereValue || undefined,
        customRoles: override?.customRoles,
        notes: override?.notes,
      });
    }
    setIsEditingWhyHere(false);
  };

  return (
    <div 
      className="group relative pl-5 pr-4 py-3 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors cursor-pointer"
      onClick={onEdit}
    >
      {/* Visual weight bar - height represents tier commitment */}
      <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-lg overflow-hidden bg-muted flex items-end">
        <div 
          className={cn(
            'w-full bg-primary transition-all',
            getBarHeightClass()
          )}
        />
      </div>
      
      <div className={`flex items-start justify-between ${getWeightOpacity()}`}>
        <div className="flex-1">
          {/* Vendor name above product name */}
          {vendor && (
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
              {vendor.name}
            </p>
          )}
          
          {/* Product name with role chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-foreground">{product.name}</h4>
            
            {/* Role chips - compact inline display */}
            {roles.length > 0 && (
              <div className="flex items-center gap-1">
                {roles.slice(0, 3).map(role => (
                  <span
                    key={role}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium',
                      ROLE_CHIP_STYLES[role] || 'bg-muted text-muted-foreground'
                    )}
                    title={PRODUCT_ROLE_LABELS[role]}
                  >
                    {SHORT_ROLE_LABELS[role]}
                  </span>
                ))}
                {roles.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{roles.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Sentence-style details */}
          <p className="text-sm text-muted-foreground mt-1">
            <span className="text-foreground">{formatNumber(application.rate, 1)} {application.rateUnit}</span>
            <span className="mx-2">•</span>
            <span className={`font-medium ${acresPercentage < 50 ? 'text-muted-foreground' : 'text-foreground'}`}>
              {formatNumber(acresPercentage, 0)}%
            </span>
            <span className="text-muted-foreground/70"> ({formatNumber(acresTreated, 0)} ac)</span>
            <span className="mx-2">•</span>
            <span className="text-primary font-medium">{formatCurrency(costPerAcre)}/ac</span>
            <span className="mx-2">•</span>
            <span className="font-medium">{formatCurrency(totalCost)}</span>
          </p>
          
          {/* Why Here note - pass-level intent */}
          {(whyHere || isEditingWhyHere) && (
            <div className="mt-2" onClick={e => e.stopPropagation()}>
              {isEditingWhyHere ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={whyHereValue}
                    onChange={(e) => setWhyHereValue(e.target.value)}
                    placeholder="Why this product here?"
                    className="flex-1 px-2 py-1 text-xs bg-background border border-input rounded"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveWhyHere();
                      if (e.key === 'Escape') setIsEditingWhyHere(false);
                    }}
                  />
                  <button
                    onClick={handleSaveWhyHere}
                    className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {whyHere}
                </p>
              )}
            </div>
          )}
          
          {/* Legacy role tag or add why here button */}
          {!whyHere && !isEditingWhyHere && (
            <div className="flex items-center gap-2 mt-1">
              {application.role && (
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground/80">{application.role}</span>
                </p>
              )}
              
              {/* Add "why here" button - only show on hover */}
              {onUpdateOverride && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingWhyHere(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-opacity"
                >
                  <Edit3 className="w-3 h-3" />
                  Add note
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

