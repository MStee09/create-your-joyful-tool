import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Beaker, 
  Droplets, 
  Save,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { ProductMaster } from '@/types';
import type { Equipment } from '@/types/field';
import type { TankMixRecipe, TankMixProduct, TankLoadSheet } from '@/types/tankMix';
import { 
  generateLoadSheet, 
  formatLoadAmount,
  getMixingOrderPriority,
} from '@/lib/tankMixCalculations';
import { isPesticideCategory } from '@/types/chemicalData';
import { formatNumber } from '@/lib/calculations';

interface MixCalculatorViewProps {
  equipment: Equipment[];
  products: ProductMaster[];
  recipes: TankMixRecipe[];
  onSaveRecipe: (recipe: Omit<TankMixRecipe, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteRecipe: (recipeId: string) => void;
  initialRecipeId?: string;
}

const RATE_UNITS = [
  { value: 'oz/ac', label: 'oz/ac' },
  { value: 'pt/ac', label: 'pt/ac' },
  { value: 'qt/ac', label: 'qt/ac' },
  { value: 'gal/ac', label: 'gal/ac' },
  { value: 'lbs/ac', label: 'lbs/ac' },
];

export const MixCalculatorView: React.FC<MixCalculatorViewProps> = ({
  equipment,
  products,
  recipes,
  onSaveRecipe,
  onDeleteRecipe,
  initialRecipeId,
}) => {
  // Selected equipment and carrier rate
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(
    equipment[0]?.id || ''
  );
  const [carrierGPA, setCarrierGPA] = useState<number>(
    equipment[0]?.defaultCarrierGPA || 10
  );
  const [totalAcres, setTotalAcres] = useState<number | undefined>(undefined);
  
  // Products in the current mix
  const [mixProducts, setMixProducts] = useState<TankMixProduct[]>([]);
  
  // Recipe save state
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  
  // Load sheet calculation
  const loadSheet = useMemo<TankLoadSheet | null>(() => {
    if (!selectedEquipmentId || mixProducts.length === 0) return null;
    
    return generateLoadSheet(
      {
        equipmentId: selectedEquipmentId,
        carrierGPA,
        totalAcres,
        products: mixProducts,
      },
      equipment,
      products
    );
  }, [selectedEquipmentId, carrierGPA, totalAcres, mixProducts, equipment, products]);
  
  // Handle equipment change
  const handleEquipmentChange = (equipId: string) => {
    setSelectedEquipmentId(equipId);
    const equip = equipment.find(e => e.id === equipId);
    if (equip?.defaultCarrierGPA) {
      setCarrierGPA(equip.defaultCarrierGPA);
    }
  };
  
  // Add product to mix
  const handleAddProduct = () => {
    setMixProducts([
      ...mixProducts,
      { productId: '', rate: 0, unit: 'oz/ac' },
    ]);
  };
  
  // Update product in mix
  const handleUpdateProduct = (index: number, updates: Partial<TankMixProduct>) => {
    setMixProducts(prev => prev.map((p, i) => 
      i === index ? { ...p, ...updates } : p
    ));
  };
  
  // Remove product from mix
  const handleRemoveProduct = (index: number) => {
    setMixProducts(prev => prev.filter((_, i) => i !== index));
  };
  
  // Load a saved recipe
  const handleLoadRecipe = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;
    
    setMixProducts(recipe.products);
    setCarrierGPA(recipe.carrierGPA);
    setRecipeName(recipe.name);
    setRecipeDescription(recipe.description || '');
    toast.success(`Loaded recipe: ${recipe.name}`);
  };
  
  // Save current mix as recipe
  const handleSaveRecipe = () => {
    if (!recipeName.trim()) {
      toast.error('Please enter a recipe name');
      return;
    }
    if (mixProducts.length === 0) {
      toast.error('Add at least one product to the mix');
      return;
    }
    
    onSaveRecipe({
      name: recipeName.trim(),
      description: recipeDescription.trim() || undefined,
      carrierGPA,
      products: mixProducts.filter(p => p.productId && p.rate > 0),
      notes: undefined,
    });
    
    toast.success('Recipe saved!');
    setShowSaveForm(false);
    setRecipeName('');
    setRecipeDescription('');
  };
  
  // Get product by ID
  const getProduct = (productId: string) => products.find(p => p.id === productId);
  
  // Check for compatibility warnings
  const compatibilityWarnings = useMemo(() => {
    const warnings: string[] = [];
    const productsInMix = mixProducts
      .map(mp => getProduct(mp.productId))
      .filter(Boolean) as ProductMaster[];
    
    // Check each product's compatibility data
    for (const product of productsInMix) {
      const chemData = product.chemicalData as any;
      if (!chemData?.compatibility) continue;
      
      const { antagonists, incompatible } = chemData.compatibility;
      
      // Check against other products in mix
      for (const other of productsInMix) {
        if (other.id === product.id) continue;
        
        const otherName = other.name.toLowerCase();
        
        if (antagonists?.some((a: string) => otherName.includes(a.toLowerCase()))) {
          warnings.push(`${product.name} may reduce efficacy when mixed with ${other.name}`);
        }
        
        if (incompatible?.some((i: string) => otherName.includes(i.toLowerCase()))) {
          warnings.push(`${product.name} may be physically incompatible with ${other.name}`);
        }
      }
    }
    
    return warnings;
  }, [mixProducts, products]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Beaker className="w-6 h-6 text-emerald-500" />
              Mix Calculator
            </h1>
            <p className="text-muted-foreground mt-1">
              Calculate per-load product amounts with proper mixing order
            </p>
          </div>
          
          {recipes.length > 0 && (
            <Select onValueChange={handleLoadRecipe}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Load saved recipe..." />
              </SelectTrigger>
              <SelectContent>
                {recipes.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input Panel */}
          <div className="space-y-4">
            {/* Equipment & Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Equipment & Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Equipment</Label>
                    <Select value={selectedEquipmentId} onValueChange={handleEquipmentChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select equipment" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipment.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name} ({e.tankSize} gal)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Carrier Rate (GPA)</Label>
                    <Input
                      type="number"
                      value={carrierGPA}
                      onChange={e => setCarrierGPA(Number(e.target.value) || 10)}
                      min={1}
                      max={50}
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Total Acres (optional)</Label>
                  <Input
                    type="number"
                    value={totalAcres || ''}
                    onChange={e => setTotalAcres(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Calculate total loads..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Products in Mix</CardTitle>
                  <Button size="sm" variant="outline" onClick={handleAddProduct}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Product
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {mixProducts.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Add products to calculate load amounts
                  </p>
                ) : (
                  mixProducts.map((mp, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <Select
                          value={mp.productId}
                          onValueChange={v => handleUpdateProduct(index, { productId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Input
                        type="number"
                        value={mp.rate || ''}
                        onChange={e => handleUpdateProduct(index, { rate: Number(e.target.value) })}
                        className="w-24"
                        placeholder="Rate"
                      />
                      
                      <Select
                        value={mp.unit}
                        onValueChange={v => handleUpdateProduct(index, { unit: v })}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RATE_UNITS.map(u => (
                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveProduct(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Save Recipe */}
            {mixProducts.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  {showSaveForm ? (
                    <div className="space-y-3">
                      <Input
                        placeholder="Recipe name"
                        value={recipeName}
                        onChange={e => setRecipeName(e.target.value)}
                      />
                      <Textarea
                        placeholder="Description (optional)"
                        value={recipeDescription}
                        onChange={e => setRecipeDescription(e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleSaveRecipe} className="flex-1">
                          <Save className="w-4 h-4 mr-1" />
                          Save Recipe
                        </Button>
                        <Button variant="outline" onClick={() => setShowSaveForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setShowSaveForm(true)}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save as Recipe
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Load Sheet Output */}
          <div className="space-y-4">
            {loadSheet ? (
              <>
                {/* Load Summary */}
                <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-emerald-600" />
                      Load Sheet: {loadSheet.equipmentName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-emerald-600">
                          {formatNumber(loadSheet.acresPerLoad)}
                        </div>
                        <div className="text-xs text-muted-foreground">Acres/Load</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {formatNumber(loadSheet.waterPerLoad)}
                        </div>
                        <div className="text-xs text-muted-foreground">Gal Water</div>
                      </div>
                      {loadSheet.totalLoads && (
                        <div>
                          <div className="text-2xl font-bold text-amber-600">
                            {loadSheet.totalLoads}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Loads</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Compatibility Warnings */}
                {compatibilityWarnings.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-medium text-amber-800 dark:text-amber-200">
                            Compatibility Notes
                          </p>
                          {compatibilityWarnings.map((w, i) => (
                            <p key={i} className="text-sm text-amber-700 dark:text-amber-300">
                              {w}
                            </p>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Mixing Order */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Mixing Order (per load)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm text-muted-foreground mb-3">
                      Fill tank 1/2 to 3/4 with water, then add products in this order:
                    </div>
                    
                    {loadSheet.products.map((p, index) => (
                      <div key={p.productId}>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{p.productName}</div>
                            <div className="text-xs text-muted-foreground">
                              {p.mixingOrderCategory} • {p.ratePerAcre} {p.rateUnit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {formatLoadAmount(p.amountPerLoad, p.amountUnit)}
                            </div>
                            <Badge variant={p.form === 'liquid' ? 'default' : 'secondary'}>
                              {p.form}
                            </Badge>
                          </div>
                        </div>
                        {index < loadSheet.products.length - 1 && (
                          <div className="flex justify-center py-1">
                            <ArrowDown className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <Separator className="my-3" />
                    
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Top off with water</div>
                        <div className="text-xs text-muted-foreground">
                          Fill to {loadSheet.tankSize} gallons
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Beaker className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select equipment and add products to see load calculations</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
