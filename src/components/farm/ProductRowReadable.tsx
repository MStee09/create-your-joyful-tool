import React from 'react';
import { Edit2 } from 'lucide-react';
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

  return (
    <div 
      className="group px-4 py-3 bg-secondary/30 hover:bg-secondary/50 rounded-lg transition-colors cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Product name - primary focus */}
          <h4 className="font-medium text-foreground">{product.name}</h4>
          
          {/* Sentence-style details */}
          <p className="text-sm text-muted-foreground mt-1">
            Rate: <span className="text-foreground">{formatNumber(application.rate, 1)} {application.rateUnit}</span>
            <span className="mx-2">•</span>
            Acres: <span className="text-foreground">{formatNumber(acresPercentage, 0)}%</span>
            <span className="text-muted-foreground/70"> ({formatNumber(acresTreated, 0)} ac)</span>
            <span className="mx-2">•</span>
            <span className="text-primary font-medium">{formatCurrency(costPerAcre)}/ac</span>
            <span className="mx-2">•</span>
            <span className="font-medium">{formatCurrency(totalCost)}</span>
          </p>
          
          {/* Role tag if present */}
          {application.role && (
            <p className="text-xs text-muted-foreground mt-1">
              Role: <span className="text-foreground/80">{application.role}</span>
            </p>
          )}
        </div>
        
        {/* Edit button - subtle until hover */}
        <button
          className="p-2 text-muted-foreground/50 group-hover:text-primary transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
