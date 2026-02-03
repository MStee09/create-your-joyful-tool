import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Upload, 
  Eye, 
  Trash2, 
  Loader2, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  CircleDashed,
  ExternalLink,
  Factory,
} from 'lucide-react';
import type { ProductMaster } from '@/types';
import type { ChemicalData } from '@/types/chemicalData';
import { getChemicalDataStatus } from '@/types/chemicalData';
import { mergeChemicalData, type DocumentSource } from '@/lib/chemicalMerge';
import { saveDocument, getDocument, deleteDocument } from '@/lib/documentStorage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KNOWN_MANUFACTURERS, findManufacturerByUrl, getLabelSearchUrl } from '@/lib/manufacturers';

interface ChemicalProductDocumentsTabProps {
  product: ProductMaster;
  onUpdateProduct: (product: ProductMaster) => void;
}

export function ChemicalProductDocumentsTab({
  product,
  onUpdateProduct,
}: ChemicalProductDocumentsTabProps) {
  const [labelDoc, setLabelDoc] = useState<{ data: string; fileName?: string } | null>(null);
  const [sdsDoc, setSdsDoc] = useState<{ data: string; fileName?: string } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState(false);
  const [manufacturerValue, setManufacturerValue] = useState(product.manufacturer || '');
  const [manufacturerWebsite, setManufacturerWebsite] = useState(product.manufacturerWebsite || '');

  // Load documents from IndexedDB
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

  const dataStatus = getChemicalDataStatus(product.chemicalData);

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
      
      setIsExtracting(true);
      toast.info('Extracting chemical data from document...');

      try {
        const { data, error } = await supabase.functions.invoke('extract-label', {
          body: { labelBase64: base64, fileName: file.name },
        });

        if (error) throw error;

        // Save document
        await saveDocument(product.id, type, base64, file.name);
        if (type === 'label') {
          setLabelDoc({ data: base64, fileName: file.name });
        } else {
          setSdsDoc({ data: base64, fileName: file.name });
        }

        // Build updates
        const updates: Partial<ProductMaster> = type === 'label' 
          ? { labelFileName: file.name }
          : { sdsFileName: file.name };

        // Update chemicalData using merge logic
        // Label is authoritative, SDS only fills gaps
        if (data.chemicalData) {
          const documentSource: DocumentSource = type === 'label' ? 'label' : 'sds';
          updates.chemicalData = mergeChemicalData(
            product.chemicalData,
            data.chemicalData,
            documentSource
          ) as ChemicalData;
        }

        // Update manufacturer from extraction if available and not already set
        if (data.manufacturer && !product.manufacturer) {
          updates.manufacturer = data.manufacturer;
        }

        // Update extraction metadata
        updates.extractionSource = type === 'label' ? 'label-pdf' : 'sds-pdf';
        updates.extractionConfidence = data.extractionConfidence || data.confidence || 'medium';
        updates.lastExtractedAt = new Date().toISOString();

        if (Object.keys(updates).length > 0) {
          onUpdateProduct({ ...product, ...updates });
          const sourceLabel = type === 'label' ? 'product label' : 'SDS';
          const mergeNote = type === 'sds' && product.chemicalData 
            ? ' (supplementing existing data)' 
            : '';
          toast.success(`Extracted chemical data from ${sourceLabel}${mergeNote}`);
        }
      } catch (err) {
        console.error('Extraction failed:', err);
        // Still save document even if extraction fails
        await saveDocument(product.id, type, base64, file.name);
        if (type === 'label') {
          setLabelDoc({ data: base64, fileName: file.name });
          onUpdateProduct({ ...product, labelFileName: file.name });
        } else {
          setSdsDoc({ data: base64, fileName: file.name });
          onUpdateProduct({ ...product, sdsFileName: file.name });
        }
        toast.error('Extraction failed, but document was saved');
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

  const handleSaveManufacturer = () => {
    // Auto-detect manufacturer from URL
    const detected = manufacturerWebsite ? findManufacturerByUrl(manufacturerWebsite) : null;
    const finalManufacturer = manufacturerValue || detected?.name || product.manufacturer;
    
    onUpdateProduct({ 
      ...product, 
      manufacturer: finalManufacturer,
      manufacturerWebsite: manufacturerWebsite || undefined,
    });
    setEditingManufacturer(false);
  };

  const labelSearchUrl = product.manufacturer ? getLabelSearchUrl(product.manufacturer) : null;

  return (
    <div className="space-y-6">
      {/* Extraction Status */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Data Extraction Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              dataStatus === 'complete' 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : dataStatus === 'partial'
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {dataStatus === 'complete' && <CheckCircle2 className="w-5 h-5" />}
              {dataStatus === 'partial' && <AlertCircle className="w-5 h-5" />}
              {dataStatus === 'none' && <CircleDashed className="w-5 h-5" />}
              <span className="font-medium capitalize">{dataStatus} Data</span>
            </div>
            {product.extractionSource && (
              <div className="text-sm text-muted-foreground">
                Source: <span className="font-medium">{product.extractionSource}</span>
              </div>
            )}
            {product.extractionConfidence && (
              <Badge variant="outline" className="capitalize">
                {product.extractionConfidence} confidence
              </Badge>
            )}
            {product.lastExtractedAt && (
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date(product.lastExtractedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manufacturer Info */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Factory className="w-4 h-4" />
            Manufacturer
          </CardTitle>
          <CardDescription>Product manufacturer (distinct from vendor)</CardDescription>
        </CardHeader>
        <CardContent>
          {editingManufacturer ? (
            <div className="space-y-4">
              <div>
                <Label>Manufacturer Name</Label>
                <Input
                  placeholder="e.g., BASF, Bayer, Corteva"
                  value={manufacturerValue}
                  onChange={(e) => setManufacturerValue(e.target.value)}
                  list="manufacturer-suggestions"
                />
                <datalist id="manufacturer-suggestions">
                  {KNOWN_MANUFACTURERS.map(m => (
                    <option key={m.name} value={m.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label>Product Page URL</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={manufacturerWebsite}
                  onChange={(e) => setManufacturerWebsite(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveManufacturer}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingManufacturer(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                {product.manufacturer ? (
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{product.manufacturer}</span>
                    {product.manufacturerWebsite && (
                      <a 
                        href={product.manufacturerWebsite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 text-sm"
                      >
                        Product Page <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {labelSearchUrl && (
                      <a 
                        href={labelSearchUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary flex items-center gap-1 text-sm"
                      >
                        Find Label <FileText className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">No manufacturer set</span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingManufacturer(true)}>
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Label PDF */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              Product Label
            </CardTitle>
            <CardDescription>Upload label PDF for AI extraction</CardDescription>
          </CardHeader>
          <CardContent>
            {labelDoc || product.labelFileName ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <span className="font-medium truncate max-w-48">
                      {labelDoc?.fileName || product.labelFileName}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {labelDoc && (
                      <Button variant="ghost" size="icon" onClick={() => handleViewDocument(labelDoc.data)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveDocument('label')}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Replace Label</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => e.target.files?.[0] && handleUploadDocument('label', e.target.files[0])}
                    className="hidden"
                    disabled={isExtracting}
                  />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                {isExtracting ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Extracting data...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Upload Label PDF</span>
                    <span className="text-xs text-muted-foreground">Max 5MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => e.target.files?.[0] && handleUploadDocument('label', e.target.files[0])}
                  className="hidden"
                  disabled={isExtracting}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* SDS PDF */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              Safety Data Sheet (SDS)
            </CardTitle>
            <CardDescription>Upload SDS for safety information</CardDescription>
          </CardHeader>
          <CardContent>
            {sdsDoc || product.sdsFileName ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-500" />
                    <span className="font-medium truncate max-w-48">
                      {sdsDoc?.fileName || product.sdsFileName}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {sdsDoc && (
                      <Button variant="ghost" size="icon" onClick={() => handleViewDocument(sdsDoc.data)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveDocument('sds')}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Replace SDS</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => e.target.files?.[0] && handleUploadDocument('sds', e.target.files[0])}
                    className="hidden"
                    disabled={isExtracting}
                  />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                {isExtracting ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Extracting data...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Upload SDS PDF</span>
                    <span className="text-xs text-muted-foreground">Max 5MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => e.target.files?.[0] && handleUploadDocument('sds', e.target.files[0])}
                  className="hidden"
                  disabled={isExtracting}
                />
              </label>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
