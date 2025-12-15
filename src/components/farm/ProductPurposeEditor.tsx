import React, { useState } from 'react';
import { Plus, X, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProductPurpose, ProductRole, ProductAnalysis } from '@/types/productIntelligence';
import { PRODUCT_ROLE_LABELS } from '@/types/productIntelligence';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductPurposeEditorProps {
  purpose: ProductPurpose | null;
  analysis?: ProductAnalysis | null;
  productName: string;
  onUpdate: (purpose: ProductPurpose) => void;
}

export const ProductPurposeEditor: React.FC<ProductPurposeEditorProps> = ({
  purpose,
  analysis,
  productName,
  onUpdate,
}) => {
  const [isGeneratingResearch, setIsGeneratingResearch] = useState(false);
  const [newSynergy, setNewSynergy] = useState('');
  const [newWatchOut, setNewWatchOut] = useState('');

  const allRoles: ProductRole[] = [
    'fertility-macro', 'fertility-micro', 'biostimulant', 
    'carbon-biology-food', 'stress-mitigation', 'uptake-translocation',
    'nitrogen-conversion', 'rooting-vigor', 'water-conditioning', 'adjuvant'
  ];

  const toggleRole = (role: ProductRole) => {
    const currentRoles = purpose?.roles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    onUpdate({
      ...purpose,
      id: purpose?.id || crypto.randomUUID(),
      productId: purpose?.productId || '',
      roles: newRoles,
    } as ProductPurpose);
  };

  const updateField = (field: keyof ProductPurpose, value: any) => {
    onUpdate({
      ...purpose,
      id: purpose?.id || crypto.randomUUID(),
      productId: purpose?.productId || '',
      roles: purpose?.roles || [],
      [field]: value,
    } as ProductPurpose);
  };

  const addSynergy = () => {
    if (!newSynergy.trim()) return;
    const synergies = [...(purpose?.synergies || []), newSynergy.trim()];
    updateField('synergies', synergies);
    setNewSynergy('');
  };

  const removeSynergy = (index: number) => {
    const synergies = (purpose?.synergies || []).filter((_, i) => i !== index);
    updateField('synergies', synergies);
  };

  const addWatchOut = () => {
    if (!newWatchOut.trim()) return;
    const watchOuts = [...(purpose?.watchOuts || []), newWatchOut.trim()];
    updateField('watchOuts', watchOuts);
    setNewWatchOut('');
  };

  const removeWatchOut = (index: number) => {
    const watchOuts = (purpose?.watchOuts || []).filter((_, i) => i !== index);
    updateField('watchOuts', watchOuts);
  };

  const generateResearchNotes = async () => {
    setIsGeneratingResearch(true);
    try {
      const { data, error } = await supabase.functions.invoke('research-notes', {
        body: {
          productName,
          analysis: analysis ? {
            npks: analysis.npks,
            micros: analysis.micros,
            carbonSources: analysis.carbonSources,
            biology: analysis.biology,
          } : null,
          purpose: purpose ? {
            roles: purpose.roles,
            primaryObjective: purpose.primaryObjective,
          } : null,
        },
      });

      if (error) throw error;

      // Update both fields at once to avoid overwrites
      onUpdate({
        ...purpose,
        id: purpose?.id || crypto.randomUUID(),
        productId: purpose?.productId || '',
        roles: purpose?.roles || [],
        researchNotes: data.researchNotes,
        researchGeneratedAt: new Date().toISOString(),
      } as ProductPurpose);
      toast.success('Research notes generated');
    } catch (error) {
      console.error('Failed to generate research notes:', error);
      toast.error('Failed to generate research notes');
    } finally {
      setIsGeneratingResearch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Roles */}
      <div>
        <h4 className="font-medium text-foreground mb-3">Product Roles</h4>
        <div className="flex flex-wrap gap-2">
          {allRoles.map(role => (
            <button
              key={role}
              onClick={() => toggleRole(role)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                purpose?.roles?.includes(role)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {PRODUCT_ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Objective */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Primary Objective
        </label>
        <textarea
          value={purpose?.primaryObjective || ''}
          onChange={(e) => updateField('primaryObjective', e.target.value)}
          placeholder="Why is this product in your program? (1 sentence)"
          className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none h-16 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* When It Matters */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          When It Matters
        </label>
        <input
          type="text"
          value={purpose?.whenItMatters || ''}
          onChange={(e) => updateField('whenItMatters', e.target.value)}
          placeholder="Growth stage or timing (e.g., 'Early vegetative', 'Pre-tassel')"
          className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Synergies */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Synergies
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(purpose?.synergies || []).map((synergy, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
              {synergy}
              <button onClick={() => removeSynergy(i)} className="hover:text-emerald-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSynergy}
            onChange={(e) => setNewSynergy(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSynergy())}
            placeholder="Add synergy (e.g., 'humics', 'low-salt starters')"
            className="flex-1 px-3 py-2 border border-input rounded-lg text-sm bg-background"
          />
          <Button variant="outline" size="sm" onClick={addSynergy}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Watch-outs */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Watch-outs
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(purpose?.watchOuts || []).map((watchOut, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
              {watchOut}
              <button onClick={() => removeWatchOut(i)} className="hover:text-amber-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newWatchOut}
            onChange={(e) => setNewWatchOut(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addWatchOut())}
            placeholder="Add caution (e.g., 'avoid high-salt mixes')"
            className="flex-1 px-3 py-2 border border-input rounded-lg text-sm bg-background"
          />
          <Button variant="outline" size="sm" onClick={addWatchOut}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Proof / Rationale */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Proof / Rationale
        </label>
        <textarea
          value={purpose?.proofRationale || ''}
          onChange={(e) => updateField('proofRationale', e.target.value)}
          placeholder="Why you believe in this product, trial results, etc."
          className="w-full px-3 py-2 border border-input rounded-lg text-sm resize-none h-20 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Research Notes */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-muted-foreground">
            Research Notes (AI-generated)
          </label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateResearchNotes}
            disabled={isGeneratingResearch}
          >
            {isGeneratingResearch ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1" />
            )}
            Generate Research
          </Button>
        </div>
        {purpose?.researchNotes ? (
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="prose prose-sm max-w-none text-foreground/90">
              {purpose.researchNotes.split('\n').map((line, i) => (
                <p key={i} className="mb-2">{line}</p>
              ))}
            </div>
            {purpose.researchGeneratedAt && (
              <p className="text-xs text-muted-foreground mt-3">
                Generated: {new Date(purpose.researchGeneratedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No research notes yet. Click "Generate Research" to get AI-backed context about this product.
          </p>
        )}
      </div>
    </div>
  );
};
