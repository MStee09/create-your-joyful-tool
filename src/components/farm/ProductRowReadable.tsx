import React from 'react';
import type { Application, Product, LiquidUnit, DryUnit } from '@/types/farm';
import { formatCurrency, formatNumber, convertToGallons, convertToPounds } from '@/utils/farmUtils';

interface ProductRowReadableProps {
  application: Application;
  product: Product | undefined;
  totalAcres: number;
  acresPercentage: number;
  onEdit: () => void;
}

export const ProductRowReadable: React.FC<ProductRowReadableProps> = ({
  application,
  product,
  totalAcres,
  acresPercentage,
  onEdit,
}) => {
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

  // Visual weight based on acres percentage
  const getWeightOpacity = () => {
    if (acresPercentage >= 90) return 'opacity-100';
    if (acresPercentage >= 50) return 'opacity-80';
    if (acresPercentage >= 25) return 'opacity-60';
    return 'opacity-50';
  };

  return (
    <div 
      className="group relative pl-5 pr-4 py-3 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors cursor-pointer"
      onClick={onEdit}
    >
      {/* Visual weight bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg overflow-hidden bg-muted">
        <div 
          className="w-full bg-primary transition-all origin-bottom"
          style={{ height: `${Math.min(100, acresPercentage)}%` }}
        />
      </div>
      
      <div className={`flex items-start justify-between ${getWeightOpacity()}`}>
        <div className="flex-1">
          {/* Product name - primary focus */}
          <h4 className="font-medium text-foreground">{product.name}</h4>
          
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
          
          {/* Role tag if present */}
          {application.role && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-foreground/80">{application.role}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
