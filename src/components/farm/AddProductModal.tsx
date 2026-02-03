import React, { useState, useMemo } from 'react';
import { Droplets, Weight, ExternalLink, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ProductMaster, ProductCategory } from '@/types';
import { CATEGORY_LABELS, generateId } from '@/lib/calculations';
import { isPesticideCategory } from '@/types/chemicalData';
import { getManufacturerNames, getLabelSearchUrl } from '@/lib/manufacturers';

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (product: ProductMaster) => void;
}

export function AddProductModal({
  open,
  onOpenChange,
  onSave,
}: AddProductModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('other');
  const [form, setForm] = useState<'liquid' | 'dry'>('liquid');
  const [manufacturer, setManufacturer] = useState('');
  const [epaRegNumber, setEpaRegNumber] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState<number | ''>('');
  const [estimatedPriceUnit, setEstimatedPriceUnit] = useState<'gal' | 'lbs' | 'ton'>('gal');
  const [density, setDensity] = useState<number | ''>('');
  const [manufacturerOpen, setManufacturerOpen] = useState(false);

  const manufacturerNames = useMemo(() => getManufacturerNames(), []);
  
  const isChemical = isPesticideCategory(category);
  const labelSearchUrl = manufacturer ? getLabelSearchUrl(manufacturer) : null;

  const resetForm = () => {
    setName('');
    setCategory('other');
    setForm('liquid');
    setManufacturer('');
    setEpaRegNumber('');
    setEstimatedPrice('');
    setEstimatedPriceUnit('gal');
    setDensity('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (isChemical && !manufacturer.trim()) return;

    const product: ProductMaster = {
      id: generateId(),
      name: name.trim(),
      category,
      form,
      defaultUnit: form === 'liquid' ? 'gal' : 'lbs',
      manufacturer: manufacturer.trim() || undefined,
      densityLbsPerGal: form === 'liquid' && typeof density === 'number' && density > 0 ? density : undefined,
      estimatedPrice: typeof estimatedPrice === 'number' && estimatedPrice > 0 ? estimatedPrice : undefined,
      estimatedPriceUnit: typeof estimatedPrice === 'number' && estimatedPrice > 0 ? estimatedPriceUnit : undefined,
      // Add chemical data structure if it's a pesticide
      chemicalData: isChemical ? {
        epaRegNumber: epaRegNumber.trim() || undefined,
      } : undefined,
    };

    onSave(product);
    handleClose();
  };

  const canSave = name.trim() && (!isChemical || manufacturer.trim());

  // Update price unit when form changes
  const handleFormChange = (newForm: 'liquid' | 'dry') => {
    setForm(newForm);
    setEstimatedPriceUnit(newForm === 'liquid' ? 'gal' : 'lbs');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Product Name */}
          <div className="space-y-1.5">
            <Label>Product Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Roundup PowerMAX"
              autoFocus
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Form */}
          <div className="space-y-1.5">
            <Label>Form *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="productForm"
                  checked={form === 'liquid'}
                  onChange={() => handleFormChange('liquid')}
                  className="w-4 h-4 text-primary"
                />
                <Droplets className="w-4 h-4 text-blue-600" />
                <span>Liquid</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="productForm"
                  checked={form === 'dry'}
                  onChange={() => handleFormChange('dry')}
                  className="w-4 h-4 text-primary"
                />
                <Weight className="w-4 h-4 text-amber-600" />
                <span>Dry</span>
              </label>
            </div>
          </div>

          {/* Manufacturer Section - Shown for chemicals, optional for others */}
          {(isChemical || category === 'biological' || category === 'micronutrient') && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>Manufacturer</span>
              </div>
              
              <div className="space-y-1.5">
                <Label>
                  Manufacturer {isChemical ? '*' : '(optional)'}
                </Label>
                <Popover open={manufacturerOpen} onOpenChange={setManufacturerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={manufacturerOpen}
                      className="w-full justify-between font-normal"
                    >
                      {manufacturer || "Select or type manufacturer..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search manufacturers..." 
                        value={manufacturer}
                        onValueChange={setManufacturer}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="py-2 text-sm text-muted-foreground">
                            Using "{manufacturer}" as custom manufacturer
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {manufacturerNames
                            .filter(m => m.toLowerCase().includes(manufacturer.toLowerCase()))
                            .map(m => (
                              <CommandItem
                                key={m}
                                value={m}
                                onSelect={(value) => {
                                  setManufacturer(value);
                                  setManufacturerOpen(false);
                                }}
                              >
                                {m}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                {labelSearchUrl && (
                  <a 
                    href={labelSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Find labels on {manufacturer} website
                  </a>
                )}
              </div>

              {isChemical && (
                <div className="space-y-1.5">
                  <Label>EPA Registration # (optional)</Label>
                  <Input
                    value={epaRegNumber}
                    onChange={(e) => setEpaRegNumber(e.target.value)}
                    placeholder="e.g., 524-579"
                  />
                </div>
              )}
            </div>
          )}

          {/* Optional Section */}
          <div className="space-y-3 pt-2 border-t">
            <div className="text-sm text-muted-foreground">Optional</div>

            {/* Estimated Price */}
            <div className="space-y-1.5">
              <Label>Estimated Price (for planning before quotes)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value ? parseFloat(e.target.value) : '')}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
                <Select 
                  value={estimatedPriceUnit} 
                  onValueChange={(v) => setEstimatedPriceUnit(v as 'gal' | 'lbs' | 'ton')}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gal">/ gal</SelectItem>
                    <SelectItem value="lbs">/ lb</SelectItem>
                    <SelectItem value="ton">/ ton</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Density - only for liquids */}
            {form === 'liquid' && (
              <div className="space-y-1.5">
                <Label>Density (lbs/gal)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={density}
                  onChange={(e) => setDensity(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="e.g., 10.5"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            Save & View Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
