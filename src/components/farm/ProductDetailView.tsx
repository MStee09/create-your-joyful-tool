import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Droplets, 
  Weight, 
  FileText, 
  Upload, 
  X, 
  Edit2, 
  Check,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  BadgeCheck,
  Link,
  ExternalLink,
  Package,
  Tag,
  ChevronDown,
} from 'lucide-react';
import type { 
  ProductMaster, 
  VendorOffering, 
  Vendor, 
  InventoryItem, 
  ProductCategory,
  ProductType,
  CommoditySpec,
} from '@/types';
import { Switch } from '@/components/ui/switch';
import { 
  formatCurrency, 
  formatNumber, 
  generateId,
  calculateCostPerPound,
  getStockStatus,
  CATEGORY_LABELS,
} from '@/lib/calculations';
import { saveDocument, getDocument, deleteDocument } from '@/lib/documentStorage';
import { Breadcrumb } from './Breadcrumb';
import { VendorOfferingsTable } from './VendorOfferingsTable';
import { ProductPurposeEditor } from './ProductPurposeEditor';
import { RoleSuggestionPanel } from './RoleSuggestionPanel';
import { UrlScrapeReviewModal } from './UrlScrapeReviewModal';
import { useProductIntelligence } from '@/hooks/useProductIntelligence';
import type { ProductPurpose, ProductRole, RoleSuggestion } from '@/types/productIntelligence';
import { PRODUCT_ROLE_LABELS } from '@/types/productIntelligence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
interface ProductDetailViewProps {
  product: ProductMaster;
  vendorOfferings: VendorOffering[];
  vendors: Vendor[];
  inventory: InventoryItem[];
  commoditySpecs?: CommoditySpec[];
  onUpdateProduct: (product: ProductMaster) => void;
  onUpdateOfferings: (offerings: VendorOffering[]) => void;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
  onUpdateSpecs?: (specs: CommoditySpec[]) => void;
  onDeleteProduct: (productId: string) => void;
  onBack: () => void;
  onNavigateToVendor?: (vendorId: string) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  vendorOfferings,
  vendors,
  inventory,
  commoditySpecs = [],
  onUpdateProduct,
  onUpdateOfferings,
  onUpdateInventory,
  onUpdateSpecs,
  onDeleteProduct,
  onBack,
  onNavigateToVendor,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'purpose' | 'notes'>('details');
  const [editingDensity, setEditingDensity] = useState(false);
  const [densityValue, setDensityValue] = useState(product.densityLbsPerGal || 0);
  const [editingReorder, setEditingReorder] = useState(false);
  const [reorderValue, setReorderValue] = useState(product.reorderPoint || 0);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(product.estimatedPrice || 0);
  const [isSuggestingRoles, setIsSuggestingRoles] = useState(false);
  
  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(product.name);
  
  // Nutrient Analysis editing
  const [editingAnalysis, setEditingAnalysis] = useState(false);
  const [analysisValues, setAnalysisValues] = useState({
    // Macros
    n: product.analysis?.n || 0,
    p: product.analysis?.p || 0,
    k: product.analysis?.k || 0,
    s: product.analysis?.s || 0,
    // Secondary
    ca: product.analysis?.ca || 0,
    mg: product.analysis?.mg || 0,
    // Micros
    b: product.analysis?.b || 0,
    zn: product.analysis?.zn || 0,
    mn: product.analysis?.mn || 0,
    fe: product.analysis?.fe || 0,
    cu: product.analysis?.cu || 0,
    mo: product.analysis?.mo || 0,
    co: product.analysis?.co || 0,
    ni: product.analysis?.ni || 0,
    cl: product.analysis?.cl || 0,
    // Carbon
    c: product.analysis?.c || 0,
  });
  
  // Role suggestion review state
  const [pendingSuggestions, setPendingSuggestions] = useState<RoleSuggestion[] | null>(null);
  const [suggestionSourceInfo, setSuggestionSourceInfo] = useState<string>('');

  // Product intelligence
  const { getPurpose, savePurpose, getAnalysis, scrapeFromUrl, isScraping } = useProductIntelligence();
  const purpose = getPurpose(product.id);
  const analysis = getAnalysis(product.id);
  
  // URL scraping state
  const [productUrl, setProductUrl] = useState(product.productUrl || '');
  const [showUrlScrapeReview, setShowUrlScrapeReview] = useState(false);
  const [scrapedData, setScrapedData] = useState<any>(null);
  
  // Commodity Spec state
  const [showSpecDropdown, setShowSpecDropdown] = useState(false);
  const [showCreateSpecModal, setShowCreateSpecModal] = useState(false);
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecCategory, setNewSpecCategory] = useState<'fertilizer' | 'chemical'>('fertilizer');
  const [newSpecUnit, setNewSpecUnit] = useState<'ton' | 'gal' | 'lbs'>('ton');
  
  // Document data loaded from IndexedDB
  const [labelDoc, setLabelDoc] = useState<{ data: string; fileName?: string } | null>(null);
  const [sdsDoc, setSdsDoc] = useState<{ data: string; fileName?: string } | null>(null);
  
  // Load documents from IndexedDB on mount
  useEffect(() => {
    const loadDocs = async () => {
      const [label, sds] = await Promise.all([
        getDocument(product.id, 'label'),
        getDocument(product.id, 'sds'),
      ]);
      setLabelDoc(label);
      setSdsDoc(sds);
    };
    loadDocs();
  }, [product.id]);

  // Get stock info
  const productInventory = inventory.filter(i => i.productId === product.id);
  const stockInfo = getStockStatus(product, inventory);
  
  // Get preferred offering for calculations
  const productOfferings = vendorOfferings.filter(o => o.productId === product.id);
  const preferredOffering = productOfferings.find(o => o.isPreferred) || productOfferings[0];
  const preferredVendor = preferredOffering ? vendors.find(v => v.id === preferredOffering.vendorId) : null;
  
  // Check if this is a "new" product (no offerings, no label, no SDS)
  const hasLabel = !!labelDoc || !!product.labelFileName;
  const hasSds = !!sdsDoc || !!product.sdsFileName;
  const isNewProduct = productOfferings.length === 0 && !hasLabel && !hasSds;

  // Calculations
  const costPerLb = preferredOffering ? calculateCostPerPound(preferredOffering, product) : null;

  const handleSaveDensity = () => {
    onUpdateProduct({ ...product, densityLbsPerGal: densityValue || undefined });
    setEditingDensity(false);
  };

  const handleSaveReorder = () => {
    onUpdateProduct({ 
      ...product, 
      reorderPoint: reorderValue || undefined,
      reorderUnit: product.form === 'liquid' ? 'gal' : 'lbs',
    });
    setEditingReorder(false);
  };

  const [isExtracting, setIsExtracting] = useState(false);

  const handleUploadDocument = async (type: 'label' | 'sds', file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      
      // Start extraction
      setIsExtracting(true);
      toast.info('Extracting product data from document...');
      
      try {
        const { data, error } = await supabase.functions.invoke('extract-label', {
          body: {
            labelBase64: base64,
            fileName: file.name,
          },
        });
        
        if (error) throw error;
        
        // Save document to IndexedDB (not localStorage to avoid quota issues)
        await saveDocument(product.id, type, base64, file.name);
        if (type === 'label') {
          setLabelDoc({ data: base64, fileName: file.name });
        } else {
          setSdsDoc({ data: base64, fileName: file.name });
        }
        
        // Build updates - only save filename to product (data is in IndexedDB)
        const updates: Partial<ProductMaster> = type === 'label' 
          ? { labelFileName: file.name }
          : { sdsFileName: file.name };
        
        // Product name (only if current is generic)
        if (data.productName && (product.name === 'New Product' || product.name.startsWith('Untitled'))) {
          updates.name = data.productName;
        }
        
        // Form
        if (data.form && (data.form === 'liquid' || data.form === 'dry')) {
          updates.form = data.form;
          updates.defaultUnit = data.form === 'liquid' ? 'gal' : 'lbs';
        }
        
        // Category
        if (data.category) {
          updates.category = data.category;
        }
        
        // Density
        if (data.densityLbsPerGal && data.densityLbsPerGal > 0) {
          updates.densityLbsPerGal = data.densityLbsPerGal;
        }
        
        // Build full nutrient analysis from extracted data
        if (data.analysis?.npks || data.analysis?.secondary || data.analysis?.micros) {
          const npks = data.analysis.npks || { n: 0, p: 0, k: 0, s: 0 };
          const secondary = data.analysis.secondary || {};
          const micros = data.analysis.micros || {};
          
          // Only update if there's any nutrient data
          const hasNutrients = npks.n > 0 || npks.p > 0 || npks.k > 0 || npks.s > 0 ||
            secondary.ca || secondary.mg || secondary.c ||
            micros.b || micros.zn || micros.mn || micros.fe || micros.cu || micros.mo;
          
          if (hasNutrients) {
            updates.analysis = {
              n: npks.n || 0,
              p: npks.p || 0,
              k: npks.k || 0,
              s: npks.s || 0,
              ...(secondary.ca && { ca: secondary.ca }),
              ...(secondary.mg && { mg: secondary.mg }),
              ...(secondary.c && { c: secondary.c }),
              ...(micros.b && { b: micros.b }),
              ...(micros.zn && { zn: micros.zn }),
              ...(micros.mn && { mn: micros.mn }),
              ...(micros.fe && { fe: micros.fe }),
              ...(micros.cu && { cu: micros.cu }),
              ...(micros.mo && { mo: micros.mo }),
              ...(micros.co && { co: micros.co }),
              ...(micros.ni && { ni: micros.ni }),
              ...(micros.cl && { cl: micros.cl }),
            };
          }
        }
        
        // Active ingredients
        if (data.activeIngredients) {
          updates.activeIngredients = data.activeIngredients;
        }
        
        // Build notes from extracted data
        const notesParts: string[] = [];
        if (data.applicationRates) {
          notesParts.push(`**Application Rates:**\n${data.applicationRates}`);
        }
        if (data.storageHandling) {
          notesParts.push(`**Storage & Handling:**\n${data.storageHandling}`);
        }
        if (data.cautions) {
          notesParts.push(`**Cautions:**\n${data.cautions}`);
        }
        if (notesParts.length > 0 && !product.generalNotes) {
          updates.generalNotes = notesParts.join('\n\n');
        }
        
        // Mixing notes
        if (data.mixingInstructions && !product.mixingNotes) {
          updates.mixingNotes = data.mixingInstructions;
        }
        
        // Crop rate notes from approved uses
        if (data.analysis?.approvedUses?.length > 0 && !product.cropRateNotes) {
          updates.cropRateNotes = `Approved uses: ${data.analysis.approvedUses.join(', ')}`;
        }
        
        // Apply all updates at once
        if (Object.keys(updates).length > 0) {
          onUpdateProduct({ ...product, ...updates });
          toast.success(`Extracted ${Object.keys(updates).length} fields from ${type}`);
        } else {
          toast.info('Document processed, but no new data to update');
        }
        
        // Handle roles if suggested
        if (data.suggestedRoles?.length > 0) {
          const newPurpose: ProductPurpose = {
            ...purpose,
            id: purpose?.id || crypto.randomUUID(),
            productId: product.id,
            roles: data.suggestedRoles,
            rolesConfirmed: false, // User should confirm
          };
          savePurpose(product.id, newPurpose);
          toast.info(`Suggested ${data.suggestedRoles.length} role(s) - review in Purpose & Roles section`);
        }
        
      } catch (extractError) {
        console.error('Extraction failed:', extractError);
        // Document was already saved to IndexedDB above, just update product metadata
        if (type === 'label') {
          onUpdateProduct({ ...product, labelFileName: file.name });
        } else {
          onUpdateProduct({ ...product, sdsFileName: file.name });
        }
        toast.error('Failed to extract data, but document was saved');
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleViewDocument = (data: string) => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<iframe src="${data}" style="width:100%;height:100%;border:none;"></iframe>`);
    }
  };

  const handleRemoveDocument = async (type: 'label' | 'sds') => {
    await deleteDocument(product.id, type);
    if (type === 'label') {
      setLabelDoc(null);
      onUpdateProduct({ ...product, labelFileName: undefined });
    } else {
      setSdsDoc(null);
      onUpdateProduct({ ...product, sdsFileName: undefined });
    }
  };

  const handleUpdateNotes = (field: 'generalNotes' | 'mixingNotes' | 'cropRateNotes', value: string) => {
    onUpdateProduct({ ...product, [field]: value });
  };

  const handleAddInventory = () => {
    const newItem: InventoryItem = {
      id: generateId(),
      productId: product.id,
      quantity: 0,
      unit: product.form === 'liquid' ? 'gal' : 'lbs',
    };
    onUpdateInventory([...inventory, newItem]);
  };

  const handleUpdateInventoryItem = (itemId: string, updates: Partial<InventoryItem>) => {
    onUpdateInventory(inventory.map(i => i.id === itemId ? { ...i, ...updates } : i));
  };

  const handleDeleteInventoryItem = (itemId: string) => {
    onUpdateInventory(inventory.filter(i => i.id !== itemId));
  };

  const handleUpdateCategory = (category: ProductCategory) => {
    onUpdateProduct({ ...product, category });
  };

  // Nutrient Analysis handlers
  const handleSaveAnalysis = () => {
    // Check if any values are set
    const hasValues = Object.values(analysisValues).some(v => v > 0);
    // Clean up zero values for optional fields
    const cleanedAnalysis = hasValues ? {
      n: analysisValues.n,
      p: analysisValues.p,
      k: analysisValues.k,
      s: analysisValues.s,
      ...(analysisValues.ca > 0 && { ca: analysisValues.ca }),
      ...(analysisValues.mg > 0 && { mg: analysisValues.mg }),
      ...(analysisValues.b > 0 && { b: analysisValues.b }),
      ...(analysisValues.zn > 0 && { zn: analysisValues.zn }),
      ...(analysisValues.mn > 0 && { mn: analysisValues.mn }),
      ...(analysisValues.fe > 0 && { fe: analysisValues.fe }),
      ...(analysisValues.cu > 0 && { cu: analysisValues.cu }),
      ...(analysisValues.mo > 0 && { mo: analysisValues.mo }),
      ...(analysisValues.co > 0 && { co: analysisValues.co }),
      ...(analysisValues.ni > 0 && { ni: analysisValues.ni }),
      ...(analysisValues.cl > 0 && { cl: analysisValues.cl }),
      ...(analysisValues.c > 0 && { c: analysisValues.c }),
    } : undefined;
    onUpdateProduct({ 
      ...product, 
      analysis: cleanedAnalysis 
    });
    setEditingAnalysis(false);
  };

  const handleCancelAnalysis = () => {
    setAnalysisValues({
      n: product.analysis?.n || 0,
      p: product.analysis?.p || 0,
      k: product.analysis?.k || 0,
      s: product.analysis?.s || 0,
      ca: product.analysis?.ca || 0,
      mg: product.analysis?.mg || 0,
      b: product.analysis?.b || 0,
      zn: product.analysis?.zn || 0,
      mn: product.analysis?.mn || 0,
      fe: product.analysis?.fe || 0,
      cu: product.analysis?.cu || 0,
      mo: product.analysis?.mo || 0,
      co: product.analysis?.co || 0,
      ni: product.analysis?.ni || 0,
      cl: product.analysis?.cl || 0,
      c: product.analysis?.c || 0,
    });
    setEditingAnalysis(false);
  };

  // Inline name editing handlers
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

  // Form toggle handler
  const handleToggleForm = (newForm: 'liquid' | 'dry') => {
    if (newForm === product.form) return;
    onUpdateProduct({
      ...product,
      form: newForm,
      defaultUnit: newForm === 'liquid' ? 'gal' : 'lbs',
      // Clear density if switching to dry
      densityLbsPerGal: newForm === 'dry' ? undefined : product.densityLbsPerGal,
    });
  };

  const handleUpdatePurpose = (newPurpose: ProductPurpose) => {
    savePurpose(product.id, newPurpose);
  };

  // AI-powered role suggestion - now opens review panel instead of auto-saving
  const handleSuggestRoles = async () => {
    setIsSuggestingRoles(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-roles', {
        body: {
          productName: product.name,
          category: product.category,
          analysis: product.analysis,
          activeIngredients: product.activeIngredients,
        },
      });

      if (error) throw error;

      // New format with suggestions array
      const suggestions: RoleSuggestion[] = data.suggestions || [];
      const sourceInfo: string = data.sourceInfo || 'Based on product information';
      
      if (suggestions.length > 0) {
        // Show review panel instead of auto-saving
        setPendingSuggestions(suggestions);
        setSuggestionSourceInfo(sourceInfo);
      } else {
        toast.info('No roles could be suggested. Try adding more product details.');
      }
    } catch (error) {
      console.error('Role suggestion failed:', error);
      toast.error('Failed to suggest roles');
    } finally {
      setIsSuggestingRoles(false);
    }
  };

  // Handle accepting roles from the review panel
  const handleAcceptRoles = (roles: ProductRole[]) => {
    const newPurpose: ProductPurpose = {
      ...purpose,
      id: purpose?.id || crypto.randomUUID(),
      productId: product.id,
      roles,
      rolesConfirmed: true,
      confirmedAt: new Date().toISOString(),
    };
    savePurpose(product.id, newPurpose);
    setPendingSuggestions(null);
    toast.success(`Confirmed ${roles.length} role${roles.length !== 1 ? 's' : ''}`);
  };

  const handleCancelSuggestions = () => {
    setPendingSuggestions(null);
  };

  // URL Scraping handler
  const handleScrapeUrl = async () => {
    if (!productUrl.trim()) {
      toast.error('Please enter a product URL');
      return;
    }
    
    // Validate URL
    try {
      new URL(productUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    // Save URL to product first
    onUpdateProduct({ ...product, productUrl });

    const data = await scrapeFromUrl(productUrl);
    if (data) {
      setScrapedData(data);
      setShowUrlScrapeReview(true);
    }
  };

  const handleApplyScrapedData = (fieldsToApply: string[]) => {
    const updates: Partial<ProductMaster> = {};
    
    if (fieldsToApply.includes('name') && scrapedData.productName) {
      updates.name = scrapedData.productName;
    }
    if (fieldsToApply.includes('form') && scrapedData.form) {
      updates.form = scrapedData.form;
      updates.defaultUnit = scrapedData.form === 'liquid' ? 'gal' : 'lbs';
    }
    if (fieldsToApply.includes('category') && scrapedData.category) {
      updates.category = scrapedData.category;
    }
    if (fieldsToApply.includes('analysis') && (scrapedData.analysis?.npks || scrapedData.analysis?.secondary || scrapedData.analysis?.micros)) {
      const npks = scrapedData.analysis.npks || { n: 0, p: 0, k: 0, s: 0 };
      const secondary = scrapedData.analysis.secondary || {};
      const micros = scrapedData.analysis.micros || {};
      
      const hasNutrients = npks.n > 0 || npks.p > 0 || npks.k > 0 || npks.s > 0 ||
        secondary.ca || secondary.mg || secondary.c ||
        micros.b || micros.zn || micros.mn || micros.fe || micros.cu || micros.mo;
      
      if (hasNutrients) {
        updates.analysis = {
          n: npks.n || 0,
          p: npks.p || 0,
          k: npks.k || 0,
          s: npks.s || 0,
          ...(secondary.ca && { ca: secondary.ca }),
          ...(secondary.mg && { mg: secondary.mg }),
          ...(secondary.c && { c: secondary.c }),
          ...(micros.b && { b: micros.b }),
          ...(micros.zn && { zn: micros.zn }),
          ...(micros.mn && { mn: micros.mn }),
          ...(micros.fe && { fe: micros.fe }),
          ...(micros.cu && { cu: micros.cu }),
          ...(micros.mo && { mo: micros.mo }),
          ...(micros.co && { co: micros.co }),
          ...(micros.ni && { ni: micros.ni }),
          ...(micros.cl && { cl: micros.cl }),
        };
      }
    }
    if (fieldsToApply.includes('density') && scrapedData.analysis?.densityLbsPerGal) {
      updates.densityLbsPerGal = scrapedData.analysis.densityLbsPerGal;
    }
    if (fieldsToApply.includes('activeIngredients') && scrapedData.activeIngredients) {
      updates.activeIngredients = scrapedData.activeIngredients;
    }
    if (fieldsToApply.includes('generalNotes') && scrapedData.generalNotes) {
      updates.generalNotes = scrapedData.generalNotes;
    }

    if (Object.keys(updates).length > 0) {
      onUpdateProduct({ ...product, ...updates });
      toast.success(`Applied ${Object.keys(updates).length} field(s) from URL`);
    }

    // Handle roles if suggested
    if (fieldsToApply.includes('roles') && scrapedData.suggestedRoles?.length > 0) {
      const newPurpose: ProductPurpose = {
        ...purpose,
        id: purpose?.id || crypto.randomUUID(),
        productId: product.id,
        roles: scrapedData.suggestedRoles,
        rolesConfirmed: true,
        confirmedAt: new Date().toISOString(),
      };
      savePurpose(product.id, newPurpose);
    }

    setShowUrlScrapeReview(false);
    setScrapedData(null);
  };

  const handleCancelScrapeReview = () => {
    setShowUrlScrapeReview(false);
    setScrapedData(null);
  };

  const StockStatusBadge = () => {
    if (stockInfo.status === 'out') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive rounded-full text-sm">
          <XCircle className="w-4 h-4" />
          Out of Stock
        </span>
      );
    }
    if (stockInfo.status === 'low') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
          <AlertTriangle className="w-4 h-4" />
          Low Stock
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
        <CheckCircle className="w-4 h-4" />
        In Stock
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Products', onClick: onBack },
          { label: product.name },
        ]} 
      />

      {/* New Product Helper Banner */}
      {isNewProduct && (
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-foreground">
              Add vendor pricing, packaging, and roles to use this product in plans.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8 relative">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={onBack} className="p-2 hover:bg-muted rounded-lg">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            {editingName ? (
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleNameKeyDown}
                className="text-3xl font-bold bg-transparent border-b-2 border-primary outline-none text-foreground"
              />
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-3xl font-bold text-foreground">{product.name}</h2>
                <button 
                  onClick={() => { setEditingName(true); setNameValue(product.name); }}
                  className="p-1 opacity-50 hover:opacity-100 transition-opacity"
                  title="Edit product name"
                >
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
                      onDeleteProduct(product.id);
                      toast.success('Product deleted');
                    }
                  }}
                  className="p-1 opacity-50 hover:opacity-100 transition-opacity text-destructive"
                  title="Delete product"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-11">
            {/* Form Toggle */}
            <div className="flex rounded overflow-hidden border border-border">
              <button
                onClick={() => handleToggleForm('liquid')}
                className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                  product.form === 'liquid' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Liquid
              </button>
              <button
                onClick={() => handleToggleForm('dry')}
                className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                  product.form === 'dry' 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Dry
              </button>
            </div>
            <select
              value={product.category}
              onChange={(e) => handleUpdateCategory(e.target.value as ProductCategory)}
              className="px-2 py-0.5 rounded text-xs font-medium bg-muted border-0 cursor-pointer hover:bg-muted/80"
            >
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {product.analysis && (
              <button 
                onClick={() => {
                  setAnalysisValues({
                    n: product.analysis?.n || 0,
                    p: product.analysis?.p || 0,
                    k: product.analysis?.k || 0,
                    s: product.analysis?.s || 0,
                    ca: product.analysis?.ca || 0,
                    mg: product.analysis?.mg || 0,
                    b: product.analysis?.b || 0,
                    zn: product.analysis?.zn || 0,
                    mn: product.analysis?.mn || 0,
                    fe: product.analysis?.fe || 0,
                    cu: product.analysis?.cu || 0,
                    mo: product.analysis?.mo || 0,
                    co: product.analysis?.co || 0,
                    ni: product.analysis?.ni || 0,
                    cl: product.analysis?.cl || 0,
                    c: product.analysis?.c || 0,
                  });
                  setEditingAnalysis(true);
                }}
                className="px-2 py-0.5 bg-muted rounded text-xs hover:bg-muted/80 transition-colors"
                title="Edit Nutrient Analysis"
              >
                {product.analysis.n}-{product.analysis.p}-{product.analysis.k}
                {product.analysis.s > 0 && `-${product.analysis.s}S`}
                {(product.analysis.ca || product.analysis.mg || product.analysis.b || product.analysis.zn) && ' +micros'}
              </button>
            )}
            {!product.analysis && (
              <button
                onClick={() => {
                  setAnalysisValues({ n: 0, p: 0, k: 0, s: 0, ca: 0, mg: 0, b: 0, zn: 0, mn: 0, fe: 0, cu: 0, mo: 0, co: 0, ni: 0, cl: 0, c: 0 });
                  setEditingAnalysis(true);
                }}
                className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                + Add Analysis
              </button>
            )}
          </div>
          
          {/* Nutrient Analysis Editor Modal */}
          {editingAnalysis && (
            <div className="absolute top-full left-11 mt-2 bg-card border border-border rounded-lg shadow-lg p-4 z-50 w-[420px]">
              <h4 className="text-sm font-medium mb-3">Nutrient Analysis</h4>
              
              {/* Macros: N-P-K-S */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Primary (N-P-K-S)</p>
                <div className="grid grid-cols-4 gap-2">
                  {(['n', 'p', 'k', 's'] as const).map((key) => (
                    <div key={key}>
                      <label className="block text-xs text-muted-foreground mb-1">{key.toUpperCase()}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={analysisValues[key]}
                        onChange={(e) => setAnalysisValues({ ...analysisValues, [key]: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Secondary: Ca, Mg */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Secondary</p>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Ca</label>
                    <input
                      type="number"
                      step="0.1"
                      value={analysisValues.ca}
                      onChange={(e) => setAnalysisValues({ ...analysisValues, ca: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Mg</label>
                    <input
                      type="number"
                      step="0.1"
                      value={analysisValues.mg}
                      onChange={(e) => setAnalysisValues({ ...analysisValues, mg: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">C</label>
                    <input
                      type="number"
                      step="0.1"
                      value={analysisValues.c}
                      onChange={(e) => setAnalysisValues({ ...analysisValues, c: Number(e.target.value) })}
                      className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                      title="Carbon / Organic Matter"
                    />
                  </div>
                </div>
              </div>
              
              {/* Micros */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Micronutrients</p>
                <div className="grid grid-cols-5 gap-2">
                  {(['b', 'zn', 'mn', 'fe', 'cu', 'mo', 'co', 'ni', 'cl'] as const).map((key) => (
                    <div key={key}>
                      <label className="block text-xs text-muted-foreground mb-1 capitalize">{key}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={analysisValues[key]}
                        onChange={(e) => setAnalysisValues({ ...analysisValues, [key]: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelAnalysis}
                  className="px-3 py-1 text-sm text-muted-foreground hover:bg-muted rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAnalysis}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-right space-y-2">
          <div className="flex items-center gap-3 justify-end">
            <div>
              <p className="text-sm text-muted-foreground">On Hand</p>
              <p className="text-2xl font-bold text-foreground">
                {formatNumber(stockInfo.totalOnHand, 0)} {product.form === 'liquid' ? 'gal' : 'lbs'}
              </p>
            </div>
            <StockStatusBadge />
          </div>
          {product.reorderPoint && (
            <p className="text-sm text-muted-foreground">
              Reorder at: {formatNumber(product.reorderPoint, 0)} {product.reorderUnit}
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="col-span-2 space-y-6">
          {/* Conversions Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Conversions & Calculations</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {product.form === 'liquid' && (
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Density (lbs/gal)</label>
                  {editingDensity ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={densityValue}
                        onChange={(e) => setDensityValue(Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-input rounded text-sm bg-background"
                      />
                      <button onClick={handleSaveDensity} className="p-1 text-primary hover:bg-primary/10 rounded">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingDensity(false)} className="p-1 text-muted-foreground hover:bg-muted rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setEditingDensity(true); setDensityValue(product.densityLbsPerGal || 0); }}
                      className="flex items-center gap-2 text-foreground hover:text-primary group"
                    >
                      <span className="text-lg font-semibold">
                        {product.densityLbsPerGal ? formatNumber(product.densityLbsPerGal, 1) : '—'}
                      </span>
                      <Edit2 className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                    </button>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Reorder Point</label>
                {editingReorder ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={reorderValue}
                      onChange={(e) => setReorderValue(Number(e.target.value))}
                      className="w-20 px-2 py-1 border border-input rounded text-sm bg-background"
                    />
                    <span className="text-sm text-muted-foreground">{product.form === 'liquid' ? 'gal' : 'lbs'}</span>
                    <button onClick={handleSaveReorder} className="p-1 text-primary hover:bg-primary/10 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingReorder(false)} className="p-1 text-muted-foreground hover:bg-muted rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { setEditingReorder(true); setReorderValue(product.reorderPoint || 0); }}
                    className="flex items-center gap-2 text-foreground hover:text-primary group"
                  >
                    <span className="text-lg font-semibold">
                      {product.reorderPoint ? formatNumber(product.reorderPoint, 0) : '—'}
                    </span>
                    <Edit2 className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                  </button>
                )}
              </div>

              {preferredOffering ? (
                <>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Cost per lb</label>
                    <p className="text-lg font-semibold text-foreground">
                      {costPerLb ? formatCurrency(costPerLb) : '—'}
                    </p>
                    {!costPerLb && product.form === 'liquid' && !product.densityLbsPerGal && (
                      <p className="text-xs text-muted-foreground">Set density to calculate</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Best Price</label>
                    <p className="text-lg font-semibold text-primary">
                      {formatCurrency(preferredOffering.price)}/{preferredOffering.priceUnit}
                    </p>
                    <p className="text-xs text-muted-foreground">{preferredVendor?.name}</p>
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <label className="block text-sm text-muted-foreground mb-1">Pricing</label>
                  {editingPrice ? (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={priceValue}
                        onChange={(e) => setPriceValue(Number(e.target.value))}
                        className="w-24 px-2 py-1 border border-input rounded text-sm bg-background"
                        autoFocus
                      />
                      <span className="text-muted-foreground">/</span>
                      <select
                        value={product.estimatedPriceUnit || product.defaultUnit}
                        onChange={(e) => onUpdateProduct({ ...product, estimatedPriceUnit: e.target.value as 'gal' | 'lbs' | 'ton' })}
                        className="px-2 py-1 border border-input rounded text-sm bg-background"
                      >
                        <option value="gal">gal</option>
                        <option value="lbs">lbs</option>
                        <option value="ton">ton</option>
                      </select>
                      <button 
                        onClick={() => {
                          onUpdateProduct({ ...product, estimatedPrice: priceValue || undefined });
                          setEditingPrice(false);
                        }} 
                        className="p-1 text-primary hover:bg-primary/10 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingPrice(false)} className="p-1 text-muted-foreground hover:bg-muted rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : product.estimatedPrice ? (
                    <button 
                      onClick={() => { setEditingPrice(true); setPriceValue(product.estimatedPrice || 0); }}
                      className="flex items-center gap-2 text-foreground hover:text-primary group"
                    >
                      <span className="text-lg font-semibold text-primary">
                        {formatCurrency(product.estimatedPrice)}/{product.estimatedPriceUnit || product.defaultUnit}
                      </span>
                      <Edit2 className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                      <span className="text-xs text-muted-foreground">(estimated)</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => { setEditingPrice(true); setPriceValue(0); }}
                      className="text-sm text-primary hover:underline"
                    >
                      + Add estimated price
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Procurement Classification */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Procurement</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {/* Product Type */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Product Type</label>
                <div className="flex rounded-lg overflow-hidden border border-border">
                  <button
                    onClick={() => onUpdateProduct({ ...product, productType: 'commodity' })}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                      product.productType === 'commodity'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    Commodity
                  </button>
                  <button
                    onClick={() => onUpdateProduct({ ...product, productType: 'specialty' })}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                      product.productType === 'specialty'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    Specialty
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {product.productType === 'commodity' 
                    ? 'Commodities can be bid competitively across vendors'
                    : 'Specialty products are typically single-source'}
                </p>
              </div>
              
              {/* Bid Eligible Toggle */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Bid Eligibility</label>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={product.isBidEligible || false}
                    onCheckedChange={(checked) => onUpdateProduct({ 
                      ...product, 
                      isBidEligible: checked,
                      // Auto-set to commodity if enabling bid eligibility
                      productType: checked && !product.productType ? 'commodity' : product.productType,
                    })}
                  />
                  <div>
                    <span className={`text-sm font-medium ${product.isBidEligible ? 'text-primary' : 'text-muted-foreground'}`}>
                      {product.isBidEligible ? 'Bid-Eligible' : 'Not Bid-Eligible'}
                    </span>
                    {product.isBidEligible && (
                      <p className="text-xs text-muted-foreground">
                        Will appear in Demand Rollup for bidding
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Commodity Spec Selector - only show when bid-eligible or commodity */}
            {(product.isBidEligible || product.productType === 'commodity') && (
              <div className="mt-4 pt-4 border-t border-border">
                <label className="block text-sm text-muted-foreground mb-2">Commodity Spec</label>
                {(() => {
                  const linkedSpec = commoditySpecs.find(s => s.id === product.commoditySpecId);
                  return (
                    <div className="relative">
                      <button
                        onClick={() => setShowSpecDropdown(!showSpecDropdown)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors text-left ${
                          linkedSpec 
                            ? 'bg-primary/5 border-primary/30 text-foreground' 
                            : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {linkedSpec ? (
                            <>
                              <BadgeCheck className="w-4 h-4 text-primary" />
                              <span className="font-medium">{linkedSpec.specName || linkedSpec.name}</span>
                              <span className="text-xs text-muted-foreground">({linkedSpec.uom || linkedSpec.unit})</span>
                            </>
                          ) : (
                            <span>Select a commodity spec...</span>
                          )}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showSpecDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showSpecDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {/* None option */}
                          <button
                            onClick={() => {
                              onUpdateProduct({ ...product, commoditySpecId: undefined });
                              setShowSpecDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors text-muted-foreground"
                          >
                            (None)
                          </button>
                          
                          {/* Existing specs */}
                          {commoditySpecs.map(spec => (
                            <button
                              key={spec.id}
                              onClick={() => {
                                onUpdateProduct({ ...product, commoditySpecId: spec.id });
                                setShowSpecDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between ${
                                product.commoditySpecId === spec.id ? 'bg-primary/10' : ''
                              }`}
                            >
                              <span className="font-medium">{spec.specName || spec.name}</span>
                              <span className="text-xs text-muted-foreground">{spec.uom || spec.unit}</span>
                            </button>
                          ))}
                          
                          {/* Divider */}
                          <div className="border-t border-border my-1" />
                          
                          {/* Create new option */}
                          <button
                            onClick={() => {
                              setShowSpecDropdown(false);
                              // Pre-fill with product info
                              setNewSpecName(product.name);
                              setNewSpecCategory(product.category?.startsWith('fertilizer') ? 'fertilizer' : 'chemical');
                              setNewSpecUnit(product.form === 'liquid' ? 'gal' : 'ton');
                              setShowCreateSpecModal(true);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-primary font-medium hover:bg-muted transition-colors flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Create new spec...
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <p className="text-xs text-muted-foreground mt-1.5">
                  Link this product to a commodity spec for bidding. Multiple products can share one spec.
                </p>
              </div>
            )}
            
            {/* Quick Stats when Bid Eligible but no spec linked */}
            {product.isBidEligible && !product.commoditySpecId && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    Link to a commodity spec to enable demand rollup and bidding
                  </span>
                </div>
              </div>
            )}
            
            {/* Linked spec confirmation */}
            {product.commoditySpecId && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">
                    This product will be included in seasonal bid events
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Create Spec Modal */}
          {showCreateSpecModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateSpecModal(false)}>
              <div className="bg-card rounded-xl shadow-xl w-full max-w-md m-4 p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-semibold text-lg mb-2">Create Commodity Spec</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This defines what is being purchased for bidding, independent of vendor or crop plan usage.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Spec Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={newSpecName}
                      onChange={(e) => setNewSpecName(e.target.value)}
                      placeholder="e.g., AMS 21-0-0-24S or Glyphosate 4lb ae"
                      className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use explicit names including analysis — this is what vendors will quote
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                      <select
                        value={newSpecCategory}
                        onChange={(e) => setNewSpecCategory(e.target.value as 'fertilizer' | 'chemical')}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                      >
                        <option value="fertilizer">Fertilizer</option>
                        <option value="chemical">Chemical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Unit</label>
                      <select
                        value={newSpecUnit}
                        onChange={(e) => setNewSpecUnit(e.target.value as 'ton' | 'gal' | 'lbs')}
                        className="w-full px-3 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                      >
                        <option value="ton">Ton</option>
                        <option value="lbs">Pounds</option>
                        <option value="gal">Gallon</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateSpecModal(false)}
                    className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!newSpecName.trim()) {
                        toast.error('Spec name is required');
                        return;
                      }
                      
                      // Check for duplicate
                      const normalizedName = newSpecName.trim().toLowerCase();
                      const duplicate = commoditySpecs.find(s => 
                        (s.name || s.specName || '').trim().toLowerCase() === normalizedName
                      );
                      if (duplicate) {
                        toast.error(`A spec named "${duplicate.specName || duplicate.name}" already exists`);
                        return;
                      }
                      
                      // Create the new spec
                      const newSpecId = crypto.randomUUID();
                      const newSpec: CommoditySpec = {
                        id: newSpecId,
                        productId: product.id,
                        name: newSpecName.trim(),
                        specName: newSpecName.trim(),
                        category: newSpecCategory,
                        unit: newSpecUnit,
                        uom: newSpecUnit,
                        analysis: product.analysis ? JSON.stringify(product.analysis) : undefined,
                      };
                      
                      // Update specs if handler provided
                      if (onUpdateSpecs) {
                        onUpdateSpecs([...commoditySpecs, newSpec]);
                      }
                      
                      // Link product to new spec
                      onUpdateProduct({ ...product, commoditySpecId: newSpecId });
                      
                      setShowCreateSpecModal(false);
                      setNewSpecName('');
                      toast.success('Commodity spec created and linked');
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                  >
                    Create & Link
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Vendor Offerings */}
          <div className="bg-card rounded-xl border border-border p-6">
            <VendorOfferingsTable
              product={product}
              offerings={vendorOfferings}
              vendors={vendors}
              onUpdateOfferings={onUpdateOfferings}
              onNavigateToVendor={onNavigateToVendor}
            />
          </div>

          {/* Purpose & Roles Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">Purpose & Roles</h3>
                {purpose?.rolesConfirmed && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    <BadgeCheck className="w-3 h-3" />
                    Confirmed
                  </span>
                )}
              </div>
              {!pendingSuggestions && (
                <button
                  onClick={handleSuggestRoles}
                  disabled={isSuggestingRoles}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 disabled:opacity-50"
                >
                  {isSuggestingRoles ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isSuggestingRoles ? 'Analyzing...' : 'AI Suggest Roles'}
                </button>
              )}
            </div>
            
            {/* Show suggestion review panel when suggestions are pending */}
            {pendingSuggestions ? (
              <RoleSuggestionPanel
                suggestions={pendingSuggestions}
                sourceInfo={suggestionSourceInfo}
                onAcceptAll={handleAcceptRoles}
                onAcceptSelected={handleAcceptRoles}
                onCancel={handleCancelSuggestions}
              />
            ) : (
              <ProductPurposeEditor
                purpose={purpose}
                analysis={analysis}
                productName={product.name}
                onUpdate={handleUpdatePurpose}
              />
            )}
          </div>

          {/* Inventory Lots */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Inventory</h3>
              <button
                onClick={handleAddInventory}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
              >
                <Plus className="w-4 h-4" />
                Add Lot
              </button>
            </div>

            {productInventory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center bg-muted/50 rounded-lg">
                No inventory tracked. Add a lot to track quantities.
              </p>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Lot #</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Quantity</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Location</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Received</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Expires</th>
                      <th className="px-3 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {productInventory.map(item => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.lotNumber || ''}
                            onChange={(e) => handleUpdateInventoryItem(item.id, { lotNumber: e.target.value })}
                            placeholder="—"
                            className="w-full bg-transparent border-0 p-0 focus:ring-0"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateInventoryItem(item.id, { quantity: Number(e.target.value) })}
                              className="w-20 px-2 py-1 border border-input rounded text-sm text-right bg-background"
                            />
                            <span className="text-muted-foreground">{item.unit}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.location || ''}
                            onChange={(e) => handleUpdateInventoryItem(item.id, { location: e.target.value })}
                            placeholder="Shop"
                            className="w-full bg-transparent border-0 p-0 focus:ring-0 text-muted-foreground"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={item.receivedDate || ''}
                            onChange={(e) => handleUpdateInventoryItem(item.id, { receivedDate: e.target.value })}
                            className="bg-transparent border-0 p-0 focus:ring-0 text-muted-foreground"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={item.expirationDate || ''}
                            onChange={(e) => handleUpdateInventoryItem(item.id, { expirationDate: e.target.value })}
                            className="bg-transparent border-0 p-0 focus:ring-0 text-muted-foreground"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleDeleteInventoryItem(item.id)}
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Documents & Notes */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Documents & Links</h3>
            <div className="space-y-4">
              {/* Product URL with Scrape */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Product URL
                  <span className="text-xs font-normal ml-1">(manufacturer page)</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="url"
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      onBlur={() => {
                        if (productUrl !== product.productUrl) {
                          onUpdateProduct({ ...product, productUrl });
                        }
                      }}
                      placeholder="https://manufacturer.com/product"
                      className="w-full pl-9 pr-8 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {productUrl && (
                      <a
                        href={productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <button
                    onClick={handleScrapeUrl}
                    disabled={isScraping || !productUrl.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isScraping ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isScraping ? 'Scraping...' : 'Scrape'}
                  </button>
                </div>
              </div>

              {/* Product Label */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Product Label</label>
                {labelDoc ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg">
                    <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{labelDoc.fileName || product.labelFileName || 'Label.pdf'}</p>
                    </div>
                    <button
                      onClick={() => handleViewDocument(labelDoc.data)}
                      className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleRemoveDocument('label')}
                      className="p-1 text-muted-foreground hover:text-destructive rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload PDF</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadDocument('label', file);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* SDS */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Safety Data Sheet (SDS)</label>
                {sdsDoc ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-lg">
                    <FileText className="w-8 h-8 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sdsDoc.fileName || product.sdsFileName || 'SDS.pdf'}</p>
                    </div>
                    <button
                      onClick={() => handleViewDocument(sdsDoc.data)}
                      className="px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleRemoveDocument('sds')}
                      className="p-1 text-muted-foreground hover:text-destructive rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload PDF</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadDocument('sds', file);
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Notes</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">General Notes</label>
                <textarea
                  value={product.generalNotes || ''}
                  onChange={(e) => handleUpdateNotes('generalNotes', e.target.value)}
                  placeholder="Product info, storage requirements..."
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none h-20 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Mixing / Compatibility</label>
                <textarea
                  value={product.mixingNotes || ''}
                  onChange={(e) => handleUpdateNotes('mixingNotes', e.target.value)}
                  placeholder="Mix order, jar test results..."
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none h-20 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Crop Rate Notes</label>
                <textarea
                  value={product.cropRateNotes || ''}
                  onChange={(e) => handleUpdateNotes('cropRateNotes', e.target.value)}
                  placeholder="What rates worked well, observations..."
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none h-20 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Active Ingredients */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Active Ingredients</h3>
            <textarea
              value={product.activeIngredients || ''}
              onChange={(e) => onUpdateProduct({ ...product, activeIngredients: e.target.value })}
              placeholder="List active ingredients or guaranteed analysis..."
              className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none h-24 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* URL Scrape Review Modal */}
      {showUrlScrapeReview && scrapedData && (
        <UrlScrapeReviewModal
          data={scrapedData}
          sourceUrl={productUrl}
          onApply={handleApplyScrapedData}
          onCancel={handleCancelScrapeReview}
        />
      )}
    </div>
  );
};
