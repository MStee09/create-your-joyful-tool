import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Beaker, 
  AlertTriangle,
  Droplets,
  Shield,
  FileText,
  ListOrdered,
  Edit2,
  Check,
  Trash2,
  Store,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ProductMaster, VendorOffering, Vendor, InventoryItem, CommoditySpec } from '@/types';
import type { ChemicalData } from '@/types/chemicalData';
import { SIGNAL_WORD_LABELS, FORMULATION_TYPES } from '@/types/chemicalData';
import { CATEGORY_LABELS } from '@/lib/calculations';
import { Breadcrumb } from '../Breadcrumb';
import { ChemicalProductOverviewTab } from './ChemicalProductOverviewTab';
import { ChemicalProductRatesTab } from './ChemicalProductRatesTab';
import { ChemicalProductRestrictionsTab } from './ChemicalProductRestrictionsTab';
import { ChemicalProductMixingTab } from './ChemicalProductMixingTab';
import { ChemicalProductDocumentsTab } from './ChemicalProductDocumentsTab';
import { ChemicalProductVendorsTab } from './ChemicalProductVendorsTab';

interface ChemicalProductDetailViewProps {
  product: ProductMaster;
  vendorOfferings: VendorOffering[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  commoditySpecs?: CommoditySpec[];
  onUpdateProduct: (product: ProductMaster) => void;
  onUpdateOfferings: (offerings: VendorOffering[]) => void;
  onDeleteProduct: (productId: string) => void;
  onBack: () => void;
  onNavigateToVendor?: (vendorId: string) => void;
}

export function ChemicalProductDetailView({
  product,
  vendorOfferings,
  vendors,
  inventory,
  commoditySpecs = [],
  onUpdateProduct,
  onUpdateOfferings,
  onDeleteProduct,
  onBack,
  onNavigateToVendor,
}: ChemicalProductDetailViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(product.name);

  const chemicalData = product.chemicalData;
  const productOfferings = vendorOfferings.filter(o => o.productId === product.id);

  const handleUpdateChemicalData = (data: ChemicalData) => {
    onUpdateProduct({ ...product, chemicalData: data });
  };

  const handleSaveName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== product.name) {
      onUpdateProduct({ ...product, name: trimmed });
    } else {
      setNameValue(product.name);
    }
    setEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    }
    if (e.key === 'Escape') {
      setNameValue(product.name);
      setEditingName(false);
    }
  };

  // Get category label
  const categoryLabel = CATEGORY_LABELS[product.category as keyof typeof CATEGORY_LABELS] || product.category;

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Products', onClick: onBack },
          { label: product.name },
        ]}
      />

      {/* Header */}
      <div className="mt-4 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              product.form === 'liquid' ? 'bg-blue-100' : 'bg-amber-100'
            }`}>
              <Beaker className={`w-6 h-6 ${product.form === 'liquid' ? 'text-blue-600' : 'text-amber-600'}`} />
            </div>

            <div>
              {/* Manufacturer */}
              {product.manufacturer && (
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {product.manufacturer}
                </p>
              )}
              
              {/* Name */}
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={handleNameKeyDown}
                    className="text-2xl font-bold h-auto py-1 px-2"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" onClick={handleSaveName}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-2 group"
                >
                  <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
                  <Edit2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline">{categoryLabel}</Badge>
                <Badge variant="secondary" className="capitalize">{product.form}</Badge>
                {chemicalData?.epaRegNumber && (
                  <Badge variant="outline" className="font-mono text-xs">
                    EPA {chemicalData.epaRegNumber}
                  </Badge>
                )}
                {chemicalData?.signalWord && chemicalData.signalWord !== 'none' && (
                  <Badge 
                    variant={chemicalData.signalWord === 'danger' ? 'destructive' : 'secondary'}
                    className="uppercase"
                  >
                    {SIGNAL_WORD_LABELS[chemicalData.signalWord]}
                  </Badge>
                )}
                {chemicalData?.formulationType && (
                  <Badge variant="outline">
                    {FORMULATION_TYPES.find(f => f.code === chemicalData.formulationType)?.code || chemicalData.formulationType}
                  </Badge>
                )}
              </div>

              {/* Active Ingredients Summary */}
              {chemicalData?.activeIngredients && chemicalData.activeIngredients.length > 0 && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <span>Active:</span>
                  {chemicalData.activeIngredients.slice(0, 3).map((ai, i) => (
                    <Badge key={i} variant="outline" className="font-normal">
                      {ai.name}
                      {ai.moaGroup && <span className="ml-1 text-xs opacity-75">({ai.moaGroup})</span>}
                    </Badge>
                  ))}
                  {chemicalData.activeIngredients.length > 3 && (
                    <span className="text-xs">+{chemicalData.activeIngredients.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{product.name}" and all associated data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDeleteProduct(product.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="rates" className="flex items-center gap-2">
            <Droplets className="w-4 h-4" />
            <span className="hidden sm:inline">Rates</span>
          </TabsTrigger>
          <TabsTrigger value="restrictions" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Restrictions</span>
          </TabsTrigger>
          <TabsTrigger value="mixing" className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4" />
            <span className="hidden sm:inline">Mixing</span>
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            <span className="hidden sm:inline">Vendors</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ChemicalProductOverviewTab
            product={product}
            chemicalData={chemicalData}
            vendorOfferings={productOfferings}
            vendors={vendors}
            onNavigateToVendor={onNavigateToVendor}
          />
        </TabsContent>

        <TabsContent value="rates">
          <ChemicalProductRatesTab
            chemicalData={chemicalData}
            onUpdate={handleUpdateChemicalData}
          />
        </TabsContent>

        <TabsContent value="restrictions">
          <ChemicalProductRestrictionsTab
            chemicalData={chemicalData}
            onUpdate={handleUpdateChemicalData}
          />
        </TabsContent>

        <TabsContent value="mixing">
          <ChemicalProductMixingTab
            chemicalData={chemicalData}
            onUpdate={handleUpdateChemicalData}
          />
        </TabsContent>

        <TabsContent value="vendors">
          <ChemicalProductVendorsTab
            product={product}
            vendorOfferings={vendorOfferings}
            vendors={vendors}
            onUpdateProduct={onUpdateProduct}
            onUpdateOfferings={onUpdateOfferings}
            onNavigateToVendor={onNavigateToVendor}
          />
        </TabsContent>

        <TabsContent value="documents">
          <ChemicalProductDocumentsTab
            product={product}
            onUpdateProduct={onUpdateProduct}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
