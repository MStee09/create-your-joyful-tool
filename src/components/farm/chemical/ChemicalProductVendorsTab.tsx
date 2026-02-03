import React, { useState } from 'react';
import { Store, DollarSign, Edit2, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { ProductMaster, VendorOffering, Vendor } from '@/types';
import { formatCurrency } from '@/lib/calculations';
import { getEffectivePrice, getPricingStatus, type EffectivePrice } from '@/lib/pricingUtils';
import { VendorOfferingsTable } from '../VendorOfferingsTable';

interface ChemicalProductVendorsTabProps {
  product: ProductMaster;
  vendorOfferings: VendorOffering[];
  vendors: Vendor[];
  onUpdateProduct: (product: ProductMaster) => void;
  onUpdateOfferings: (offerings: VendorOffering[]) => void;
  onNavigateToVendor?: (vendorId: string) => void;
  onAddVendor?: (vendor: Vendor) => void;
}

export function ChemicalProductVendorsTab({
  product,
  vendorOfferings,
  vendors,
  onUpdateProduct,
  onUpdateOfferings,
  onNavigateToVendor,
  onAddVendor,
}: ChemicalProductVendorsTabProps) {
  const [editingEstPrice, setEditingEstPrice] = useState(false);
  const [estPriceValue, setEstPriceValue] = useState<number>(product.estimatedPrice || 0);
  const [estPriceUnit, setEstPriceUnit] = useState<'gal' | 'lbs' | 'ton'>(
    (product.estimatedPriceUnit as 'gal' | 'lbs' | 'ton') || (product.form === 'liquid' ? 'gal' : 'lbs')
  );

  const effectivePrice = getEffectivePrice(product, vendorOfferings, vendors);
  const pricingStatus = getPricingStatus(product, vendorOfferings);
  const productOfferings = vendorOfferings.filter(o => o.productId === product.id);

  const handleSaveEstPrice = () => {
    onUpdateProduct({
      ...product,
      estimatedPrice: estPriceValue > 0 ? estPriceValue : undefined,
      estimatedPriceUnit: estPriceValue > 0 ? estPriceUnit : undefined,
    });
    setEditingEstPrice(false);
  };

  const handleCancelEstPrice = () => {
    setEstPriceValue(product.estimatedPrice || 0);
    setEstPriceUnit((product.estimatedPriceUnit as 'gal' | 'lbs' | 'ton') || (product.form === 'liquid' ? 'gal' : 'lbs'));
    setEditingEstPrice(false);
  };

  return (
    <div className="space-y-6">
      {/* Effective Price Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Effective Price
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {effectivePrice ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">
                      {formatCurrency(effectivePrice.price)}/{effectivePrice.unit}
                    </span>
                    <Badge 
                      variant={effectivePrice.source === 'vendor' ? 'default' : 'secondary'}
                      className={effectivePrice.source === 'vendor' ? 'bg-emerald-600' : 'bg-amber-500'}
                    >
                      {effectivePrice.source === 'vendor' ? (
                        <>
                          <Store className="w-3 h-3 mr-1" />
                          Vendor Price
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-3 h-3 mr-1" />
                          Estimated
                        </>
                      )}
                    </Badge>
                  </div>
                  {effectivePrice.source === 'vendor' && effectivePrice.vendorName && (
                    <p className="text-sm text-muted-foreground">
                      From <span className="font-medium">{effectivePrice.vendorName}</span> (lowest available)
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <span className="text-lg font-medium">No price set</span>
                  <Badge variant="destructive">Cannot add to plan</Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estimated Price (Fallback) */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Estimated Price (Fallback)</CardTitle>
            {!editingEstPrice && (
              <Button variant="ghost" size="sm" onClick={() => setEditingEstPrice(true)}>
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Used for planning when no vendor quote is available. This price will be overridden by vendor offerings.
          </p>
          
          {editingEstPrice ? (
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={estPriceValue || ''}
                  onChange={(e) => setEstPriceValue(parseFloat(e.target.value) || 0)}
                  className="w-32 pl-7"
                  placeholder="0.00"
                />
              </div>
              <Select value={estPriceUnit} onValueChange={(v) => setEstPriceUnit(v as 'gal' | 'lbs' | 'ton')}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gal">/ gal</SelectItem>
                  <SelectItem value="lbs">/ lb</SelectItem>
                  <SelectItem value="ton">/ ton</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleSaveEstPrice}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEstPrice}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {product.estimatedPrice && product.estimatedPrice > 0 ? (
                <span className="text-lg font-medium">
                  {formatCurrency(product.estimatedPrice)}/{product.estimatedPriceUnit || 'gal'}
                </span>
              ) : (
                <span className="text-muted-foreground italic">Not set</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendor Offerings Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="w-5 h-5" />
            Vendor Offerings
            {productOfferings.length > 0 && (
              <Badge variant="outline">{productOfferings.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VendorOfferingsTable
            product={product}
            offerings={vendorOfferings}
            vendors={vendors}
            onUpdateOfferings={onUpdateOfferings}
            onNavigateToVendor={onNavigateToVendor}
            onCreateVendor={onAddVendor ? async (vendorData) => {
              const newVendor: Vendor = {
                id: crypto.randomUUID(),
                name: vendorData.name || '',
                contactEmail: vendorData.contactEmail,
                contactPhone: vendorData.contactPhone,
                contacts: [],
                documents: [],
                tags: [],
              };
              onAddVendor(newVendor);
              return newVendor;
            } : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
