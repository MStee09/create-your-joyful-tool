import React, { useState } from 'react';
import { X, Check, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ProductAnalysis, ProductRole, LabelExtractionResult } from '@/types/productIntelligence';
import { PRODUCT_ROLE_LABELS } from '@/types/productIntelligence';
import { generateId } from '@/utils/farmUtils';

interface AnalysisReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  extractionResult: LabelExtractionResult;
  onConfirm: (analysis: ProductAnalysis, roles: ProductRole[]) => void;
}

export const AnalysisReviewModal: React.FC<AnalysisReviewModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  extractionResult,
  onConfirm,
}) => {
  const [editedAnalysis, setEditedAnalysis] = useState(extractionResult.analysis);
  const [selectedRoles, setSelectedRoles] = useState<ProductRole[]>(extractionResult.suggestedRoles);

  const confidenceColors = {
    high: 'text-emerald-600 bg-emerald-100',
    medium: 'text-amber-600 bg-amber-100',
    low: 'text-red-600 bg-red-100',
  };

  const handleConfirm = () => {
    const analysis: ProductAnalysis = {
      id: generateId(),
      productId,
      ...editedAnalysis,
      userConfirmed: true,
    };
    onConfirm(analysis, selectedRoles);
    onClose();
  };

  const toggleRole = (role: ProductRole) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const allRoles: ProductRole[] = [
    'fertility-macro', 'fertility-micro', 'biostimulant', 
    'carbon-biology-food', 'stress-mitigation', 'uptake-translocation',
    'nitrogen-conversion', 'rooting-vigor', 'water-conditioning', 'adjuvant'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Review Extracted Analysis
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${confidenceColors[editedAnalysis.extractionConfidence]}`}>
              {editedAnalysis.extractionConfidence} confidence
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground">
            Review and correct the extracted data for <strong>{productName}</strong>. 
            Once confirmed, this will be saved as the product's analysis.
          </p>

          {/* NPK-S Section */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-3">Guaranteed Analysis (NPK-S)</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Nitrogen (N)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editedAnalysis.npks.n}
                  onChange={(e) => setEditedAnalysis(prev => ({
                    ...prev,
                    npks: { ...prev.npks, n: Number(e.target.value) }
                  }))}
                  className="w-full px-2 py-1.5 border border-input rounded text-sm bg-background"
                />
                <select
                  value={editedAnalysis.npks.nForm || ''}
                  onChange={(e) => setEditedAnalysis(prev => ({
                    ...prev,
                    npks: { ...prev.npks, nForm: e.target.value as any || undefined }
                  }))}
                  className="w-full mt-1 px-2 py-1 border border-input rounded text-xs bg-background text-muted-foreground"
                >
                  <option value="">Form unknown</option>
                  <option value="urea">Urea</option>
                  <option value="nh4">Ammonium (NH₄)</option>
                  <option value="no3">Nitrate (NO₃)</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Phosphorus (P)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editedAnalysis.npks.p}
                  onChange={(e) => setEditedAnalysis(prev => ({
                    ...prev,
                    npks: { ...prev.npks, p: Number(e.target.value) }
                  }))}
                  className="w-full px-2 py-1.5 border border-input rounded text-sm bg-background"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Potassium (K)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editedAnalysis.npks.k}
                  onChange={(e) => setEditedAnalysis(prev => ({
                    ...prev,
                    npks: { ...prev.npks, k: Number(e.target.value) }
                  }))}
                  className="w-full px-2 py-1.5 border border-input rounded text-sm bg-background"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Sulfur (S)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editedAnalysis.npks.s}
                  onChange={(e) => setEditedAnalysis(prev => ({
                    ...prev,
                    npks: { ...prev.npks, s: Number(e.target.value) }
                  }))}
                  className="w-full px-2 py-1.5 border border-input rounded text-sm bg-background"
                />
                <select
                  value={editedAnalysis.npks.sForm || ''}
                  onChange={(e) => setEditedAnalysis(prev => ({
                    ...prev,
                    npks: { ...prev.npks, sForm: e.target.value as any || undefined }
                  }))}
                  className="w-full mt-1 px-2 py-1 border border-input rounded text-xs bg-background text-muted-foreground"
                >
                  <option value="">Form unknown</option>
                  <option value="sulfate">Sulfate</option>
                  <option value="thiosulfate">Thiosulfate</option>
                  <option value="elemental">Elemental</option>
                </select>
              </div>
            </div>
          </div>

          {/* Micronutrients */}
          {editedAnalysis.micros && Object.values(editedAnalysis.micros).some(v => v !== null && v !== undefined) && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-3">Micronutrients</h4>
              <div className="grid grid-cols-4 gap-3">
                {(['boron', 'zinc', 'manganese', 'iron', 'copper', 'molybdenum', 'cobalt', 'nickel'] as const).map(micro => (
                  <div key={micro}>
                    <label className="block text-xs text-muted-foreground mb-1 capitalize">{micro}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedAnalysis.micros?.[micro] ?? ''}
                      onChange={(e) => setEditedAnalysis(prev => ({
                        ...prev,
                        micros: { ...prev.micros, [micro]: e.target.value ? Number(e.target.value) : undefined }
                      }))}
                      className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Carbon Sources */}
          {editedAnalysis.carbonSources && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-3">Carbon Sources</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Humic Acid (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editedAnalysis.carbonSources.humicAcid ?? ''}
                    onChange={(e) => setEditedAnalysis(prev => ({
                      ...prev,
                      carbonSources: { ...prev.carbonSources, humicAcid: e.target.value ? Number(e.target.value) : undefined }
                    }))}
                    className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Fulvic Acid (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editedAnalysis.carbonSources.fulvicAcid ?? ''}
                    onChange={(e) => setEditedAnalysis(prev => ({
                      ...prev,
                      carbonSources: { ...prev.carbonSources, fulvicAcid: e.target.value ? Number(e.target.value) : undefined }
                    }))}
                    className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Amino Acids</label>
                  <input
                    type="text"
                    value={editedAnalysis.carbonSources.aminoAcids ?? ''}
                    onChange={(e) => setEditedAnalysis(prev => ({
                      ...prev,
                      carbonSources: { ...prev.carbonSources, aminoAcids: e.target.value || undefined }
                    }))}
                    className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                    placeholder="e.g., L-amino blend"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Sugars</label>
                  <input
                    type="text"
                    value={editedAnalysis.carbonSources.sugars ?? ''}
                    onChange={(e) => setEditedAnalysis(prev => ({
                      ...prev,
                      carbonSources: { ...prev.carbonSources, sugars: e.target.value || undefined }
                    }))}
                    className="w-full px-2 py-1 border border-input rounded text-sm bg-background"
                    placeholder="e.g., molasses, dextrose"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Biology */}
          {editedAnalysis.biology && (
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-3">Biology</h4>
              <div className="space-y-3">
                {editedAnalysis.biology.microbes && editedAnalysis.biology.microbes.length > 0 && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Microbes</label>
                    <p className="text-sm text-foreground">{editedAnalysis.biology.microbes.join(', ')}</p>
                  </div>
                )}
                {editedAnalysis.biology.cfuPerMl && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">CFU/mL</label>
                    <p className="text-sm text-foreground">{editedAnalysis.biology.cfuPerMl.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Density */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-3">Physical Properties</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Density (lbs/gal)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editedAnalysis.densityLbsPerGal ?? ''}
                  onChange={(e) => setEditedAnalysis(prev => ({
                    ...prev,
                    densityLbsPerGal: e.target.value ? Number(e.target.value) : undefined
                  }))}
                  className="w-full px-2 py-1.5 border border-input rounded text-sm bg-background"
                  placeholder="Not found on label"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Approved Uses</label>
                <p className="text-sm text-foreground">
                  {editedAnalysis.approvedUses.length > 0 
                    ? editedAnalysis.approvedUses.join(', ')
                    : 'None specified'}
                </p>
              </div>
            </div>
          </div>

          {/* Suggested Roles */}
          <div>
            <h4 className="font-medium text-foreground mb-3">Product Roles</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Select the roles this product fulfills in your program. AI suggested roles are pre-selected.
            </p>
            <div className="flex flex-wrap gap-2">
              {allRoles.map(role => (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedRoles.includes(role)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {PRODUCT_ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {editedAnalysis.extractionConfidence === 'low' && (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Low confidence - please review carefully
              </>
            )}
            {editedAnalysis.extractionConfidence === 'high' && (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                High confidence extraction
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleConfirm}>
              <Check className="w-4 h-4 mr-1" />
              Confirm & Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
