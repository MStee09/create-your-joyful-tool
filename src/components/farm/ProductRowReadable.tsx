import React, { useState } from 'react';
import { MessageSquare, Edit3, Award } from 'lucide-react';
import type { Application, Product, LiquidUnit, DryUnit, Vendor } from '@/types/farm';
import type { ProductMaster, PriceBookEntry } from '@/types';
import type { ProductPurpose, ProductRole, ApplicationOverride } from '@/types/productIntelligence';
import { PRODUCT_ROLE_LABELS } from '@/types/productIntelligence';
import { formatCurrency, formatNumber, convertToGallons, convertToPounds } from '@/utils/farmUtils';
import { cn } from '@/lib/utils';
import { getAwardedPriceInfo } from '@/lib/priceBookUtils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProductRowReadableProps {
  application: Application;
  product: Product | undefined;
  vendor?: Vendor | null;
  totalAcres: number;
  acresPercentage: number;
  purpose?: ProductPurpose | null;
  override?: ApplicationOverride | null;
  productMasters?: ProductMaster[];
  priceBook?: PriceBookEntry[];
  seasonYear?: number;
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

// Coverage label based on percentage
const getCoverageLabel = (percentage: number): string => {
  if (percentage >= 90) return 'Core';
  if (percentage >= 50) return 'Building';
  return 'Trial';
};

export const ProductRowReadable: React.FC<ProductRowReadableProps> = ({
  application,
  product,
  vendor,
  totalAcres,
  acresPercentage,
  purpose,
  override,
  productMasters = [],
  priceBook = [],
  seasonYear = new Date().getFullYear(),
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

  // Check if this product has an awarded bid price
  const awardedPriceInfo = getAwardedPriceInfo(product.id, seasonYear, productMasters, priceBook);

  // Calculate costs - treated (intensity) and field (budget)
  let treatedCostPerAcre = 0;
  if (product.form === 'liquid') {
    const gallonsPerAcre = convertToGallons(application.rate, application.rateUnit as LiquidUnit);
    treatedCostPerAcre = gallonsPerAcre * product.price;
  } else {
    const poundsPerAcre = convertToPounds(application.rate, application.rateUnit as DryUnit);
    const pricePerPound = product.priceUnit === 'ton' ? product.price / 2000 : product.price;
    treatedCostPerAcre = poundsPerAcre * pricePerPound;
  }

  // Field average cost = treated cost × coverage fraction (budget truth)
  const fieldAvgCostPerAcre = treatedCostPerAcre * (acresPercentage / 100);
  const acresTreated = totalAcres * (acresPercentage / 100);
  // Total cost is always field-weighted (what you actually spend)
  const totalCost = fieldAvgCostPerAcre * totalAcres;

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

  const isFullCoverage = acresPercentage >= 100;
  const coverageLabel = getCoverageLabel(acresPercentage);

  return (
    <div 
      className="group relative pl-5 pr-4 py-3 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors cursor-pointer"
      onClick={onEdit}
    >
      {/* Visual weight bar - height and opacity represent tier commitment */}
      <div className="absolute left-0 top-0 bottom-0 w-2 rounded-l-lg overflow-hidden bg-muted flex items-end">
        <div 
          className={cn(
            'w-full bg-primary transition-all',
            getBarHeightClass(),
            acresPercentage >= 90 ? 'opacity-100' :
            acresPercentage >= 60 ? 'opacity-80' :
            acresPercentage >= 40 ? 'opacity-60' :
            'opacity-40'
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
          
          {/* Product name with coverage badge and role chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-foreground">{product.name}</h4>
            
            {/* Awarded bid price indicator */}
            {awardedPriceInfo.isAwarded && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 rounded text-[10px] font-medium">
                      <Award className="w-3 h-3" />
                      Bid
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">Awarded bid price</p>
                    <p className="text-muted-foreground">
                      {formatCurrency(awardedPriceInfo.price || 0)}/{awardedPriceInfo.priceUom}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Coverage badge - promoted to header level */}
            <span className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-medium',
              isFullCoverage 
                ? 'bg-primary/15 text-primary' 
                : 'bg-muted text-muted-foreground'
            )}>
              {coverageLabel} • {formatNumber(acresPercentage, 0)}% ({formatNumber(acresTreated, 0)} ac)
            </span>
            
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
          
          {/* Rate line */}
          <p className="text-sm text-muted-foreground mt-1.5">
            {formatNumber(application.rate, 1)} {application.rateUnit}
          </p>
          
          {/* Cost breakdown - stacked with clear hierarchy */}
          <div className="flex items-baseline gap-4 mt-1 text-sm">
            {isFullCoverage ? (
              /* Single cost when 100% coverage */
              <>
                <span className="text-primary font-semibold">
                  {formatCurrency(treatedCostPerAcre)}/ac
                </span>
                <span className="text-muted-foreground/70 text-xs">
                  {formatCurrency(totalCost)} total
                </span>
              </>
            ) : (
              /* Split costs when partial coverage */
              <>
                {/* Field avg - PRIMARY (budget truth) */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-primary font-semibold cursor-help">
                        {formatCurrency(fieldAvgCostPerAcre)}/ac{' '}
                        <span className="underline decoration-dotted decoration-primary/50">field</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>Field avg = treated cost × % of acres</p>
                      <p className="text-muted-foreground mt-0.5">
                        {formatCurrency(treatedCostPerAcre)} × {formatNumber(acresPercentage, 0)}% = {formatCurrency(fieldAvgCostPerAcre)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Treated - SECONDARY (intensity context) */}
                <span className="text-muted-foreground">
                  {formatCurrency(treatedCostPerAcre)}/ac treated
                </span>
                
                {/* Total - TERTIARY */}
                <span className="text-muted-foreground/70 text-xs">
                  {formatCurrency(totalCost)} total
                </span>
              </>
            )}
          </div>
          
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

