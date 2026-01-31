import React, { useState, useMemo } from 'react';
import { X, Plus, Droplets, Weight, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { ProductMaster, VendorOffering, Vendor, ProductCategory } from '@/types';
import { generateId, CATEGORY_LABELS } from '@/lib/calculations';

interface AddProductToVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Vendor;
  existingProducts: ProductMaster[];
  existingOfferings: VendorOffering[];
  onAddOffering: (offering: VendorOffering) => void;
  onAddProduct: (product: ProductMaster, offering: VendorOffering) => void;
}

type Mode = 'existing' | 'new';

const PACKAGING_OPTIONS = ['Tote', 'Drum', 'Twin-pack', 'Jug', 'Bag', 'Bulk', 'Case'];

export const AddProductToVendorModal: React.FC<AddProductToVendorModalProps> = ({
  isOpen,
  onClose,
  vendor,
  existingProducts,
  existingOfferings,
  onAddOffering,
  onAddProduct,
}) => {
  const [mode, setMode] = useState<Mode>('existing');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Existing product selection
  const [selectedProductId, setSelectedProductId] = useState('');
  const [setAsPreferred, setSetAsPreferred] = useState(false);
  
  // Common pricing fields
  const [price, setPrice] = useState<number>(0);
  const [priceUnit, setPriceUnit] = useState<'gal' | 'lbs' | 'ton'>('gal');
  const [packaging, setPackaging] = useState('');
  const [customPackaging, setCustomPackaging] = useState('');
  
  // New product fields
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('other');
  const [newForm, setNewForm] = useState<'liquid' | 'dry'>('liquid');
  const [newDensity, setNewDensity] = useState<number>(0);

  // Filter products that don't already have an offering from this vendor
  const availableProducts = useMemo(() => {
    const vendorProductIds = new Set(
      existingOfferings
        .filter(o => o.vendorId === vendor.id)
        .map(o => o.productId)
    );
    return existingProducts
      .filter(p => !vendorProductIds.has(p.id))
      .filter(p => 
        searchTerm === '' || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [existingProducts, existingOfferings, vendor.id, searchTerm]);

  const selectedProduct = existingProducts.find(p => p.id === selectedProductId);

  const resetForm = () => {
    setMode('existing');
    setSearchTerm('');
    setSelectedProductId('');
    setSetAsPreferred(false);
    setPrice(0);
    setPriceUnit('gal');
    setPackaging('');
    setCustomPackaging('');
    setNewName('');
    setNewCategory('other');
    setNewForm('liquid');
    setNewDensity(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = () => {
    const finalPackaging = packaging === 'custom' ? customPackaging : packaging;

    if (mode === 'existing' && selectedProductId) {
      const offering: VendorOffering = {
        id: generateId(),
        productId: selectedProductId,
        vendorId: vendor.id,
        price,
        priceUnit,
        packaging: finalPackaging || undefined,
        isPreferred: setAsPreferred,
      };
      onAddOffering(offering);
    } else if (mode === 'new' && newName.trim()) {
      const product: ProductMaster = {
        id: generateId(),
        name: newName.trim(),
        category: newCategory,
        form: newForm,
        defaultUnit: newForm === 'liquid' ? 'gal' : 'lbs',
        densityLbsPerGal: newForm === 'liquid' && newDensity > 0 ? newDensity : undefined,
      };
      const offering: VendorOffering = {
        id: generateId(),
        productId: product.id,
        vendorId: vendor.id,
        price,
        priceUnit,
        packaging: finalPackaging || undefined,
        isPreferred: true, // First vendor is always preferred
      };
      onAddProduct(product, offering);
    }
    handleClose();
  };

  const isValid = mode === 'existing' 
    ? selectedProductId && price > 0 
    : newName.trim() && price > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Product to {vendor.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selection */}
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" />
              <Label htmlFor="existing" className="cursor-pointer">
                Add existing product from catalog
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new" className="cursor-pointer">
                Create new product
              </Label>
            </div>
          </RadioGroup>

          <div className="border-t border-border pt-4 space-y-4">
            {mode === 'existing' ? (
              <>
                {/* Product Search */}
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-input rounded-md">
                    {availableProducts.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        {searchTerm ? 'No matching products' : 'All products already added'}
                      </div>
                    ) : (
                      availableProducts.map(product => (
                        <button
                          key={product.id}
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setPriceUnit(product.form === 'liquid' ? 'gal' : 'lbs');
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-muted transition-colors ${
                            selectedProductId === product.id ? 'bg-primary/10' : ''
                          }`}
                        >
                          {product.form === 'liquid' ? (
                            <Droplets className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Weight className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="font-medium">{product.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {CATEGORY_LABELS[product.category] || product.category}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Set as Preferred */}
                {selectedProduct && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="preferred" 
                      checked={setAsPreferred}
                      onCheckedChange={(checked) => setSetAsPreferred(checked === true)}
                    />
                    <Label htmlFor="preferred" className="cursor-pointer text-sm">
                      Set as preferred vendor for this product
                    </Label>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* New Product Name */}
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input
                    placeholder="e.g., BioAg E"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={newCategory} onValueChange={(v) => setNewCategory(v as ProductCategory)}>
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
                <div className="space-y-2">
                  <Label>Form *</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={newForm === 'liquid'}
                        onChange={() => {
                          setNewForm('liquid');
                          setPriceUnit('gal');
                        }}
                        className="w-4 h-4"
                      />
                      <Droplets className="w-4 h-4 text-blue-500" />
                      <span>Liquid</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={newForm === 'dry'}
                        onChange={() => {
                          setNewForm('dry');
                          setPriceUnit('lbs');
                        }}
                        className="w-4 h-4"
                      />
                      <Weight className="w-4 h-4 text-amber-500" />
                      <span>Dry</span>
                    </label>
                  </div>
                </div>

                {/* Density (for liquids) */}
                {newForm === 'liquid' && (
                  <div className="space-y-2">
                    <Label>Density (lbs/gal)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 10.5"
                      value={newDensity || ''}
                      onChange={(e) => setNewDensity(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}

                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  ℹ️ This vendor will be set as the preferred supplier.
                </p>
              </>
            )}

            {/* Common Pricing Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price || ''}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Per</Label>
                <Select value={priceUnit} onValueChange={(v) => setPriceUnit(v as 'gal' | 'lbs' | 'ton')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gal">gallon</SelectItem>
                    <SelectItem value="lbs">lb</SelectItem>
                    <SelectItem value="ton">ton</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Packaging */}
            <div className="space-y-2">
              <Label>Packaging</Label>
              <Select value={packaging} onValueChange={setPackaging}>
                <SelectTrigger>
                  <SelectValue placeholder="Select packaging..." />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGING_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
              {packaging === 'custom' && (
                <Input
                  placeholder="e.g., 275 gal tote"
                  value={customPackaging}
                  onChange={(e) => setCustomPackaging(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Add to Vendor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

