import React, { useState } from 'react';
import { X, Check, ExternalLink, Sparkles } from 'lucide-react';
import { PRODUCT_ROLE_LABELS } from '@/types/productIntelligence';
import type { ProductRole } from '@/types/productIntelligence';
import { CATEGORY_LABELS } from '@/lib/calculations';

interface ScrapedData {
  productName?: string;
  form?: 'liquid' | 'dry';
  category?: string;
  analysis?: {
    npks?: { n: number; p: number; k: number; s: number };
    densityLbsPerGal?: number;
    extractionConfidence?: string;
  };
  activeIngredients?: string;
  generalNotes?: string;
  suggestedRoles?: ProductRole[];
}

interface UrlScrapeReviewModalProps {
  data: ScrapedData;
  sourceUrl: string;
  onApply: (fieldsToApply: string[]) => void;
  onCancel: () => void;
}

export const UrlScrapeReviewModal: React.FC<UrlScrapeReviewModalProps> = ({
  data,
  sourceUrl,
  onApply,
  onCancel,
}) => {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (data.productName) initial.add('name');
    if (data.form) initial.add('form');
    if (data.category) initial.add('category');
    if (data.analysis?.npks && (data.analysis.npks.n > 0 || data.analysis.npks.p > 0 || data.analysis.npks.k > 0 || data.analysis.npks.s > 0)) {
      initial.add('analysis');
    }
    if (data.analysis?.densityLbsPerGal) initial.add('density');
    if (data.activeIngredients) initial.add('activeIngredients');
    if (data.generalNotes) initial.add('generalNotes');
    if (data.suggestedRoles?.length) initial.add('roles');
    return initial;
  });

  const toggleField = (field: string) => {
    const newSet = new Set(selectedFields);
    if (newSet.has(field)) {
      newSet.delete(field);
    } else {
      newSet.add(field);
    }
    setSelectedFields(newSet);
  };

  const handleApply = () => {
    onApply(Array.from(selectedFields));
  };

  const confidence = data.analysis?.extractionConfidence || 'medium';
  const confidenceColor = confidence === 'high' ? 'text-primary' : confidence === 'medium' ? 'text-amber-600' : 'text-muted-foreground';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border shadow-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Review Scraped Data</h3>
          </div>
          <button onClick={onCancel} className="p-1 text-muted-foreground hover:text-foreground rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <ExternalLink className="w-4 h-4" />
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary truncate">
              {sourceUrl}
            </a>
          </div>

          <p className={`text-sm ${confidenceColor} mb-4`}>
            Extraction confidence: <span className="font-medium capitalize">{confidence}</span>
          </p>

          {/* Field checkboxes */}
          <div className="space-y-2">
            {data.productName && (
              <FieldRow
                field="name"
                label="Product Name"
                value={data.productName}
                selected={selectedFields.has('name')}
                onToggle={() => toggleField('name')}
              />
            )}

            {data.form && (
              <FieldRow
                field="form"
                label="Form"
                value={data.form === 'liquid' ? 'Liquid' : 'Dry'}
                selected={selectedFields.has('form')}
                onToggle={() => toggleField('form')}
              />
            )}

            {data.category && (
              <FieldRow
                field="category"
                label="Category"
                value={CATEGORY_LABELS[data.category as keyof typeof CATEGORY_LABELS] || data.category}
                selected={selectedFields.has('category')}
                onToggle={() => toggleField('category')}
              />
            )}

            {data.analysis?.npks && (data.analysis.npks.n > 0 || data.analysis.npks.p > 0 || data.analysis.npks.k > 0 || data.analysis.npks.s > 0) && (
              <FieldRow
                field="analysis"
                label="NPK-S Analysis"
                value={`${data.analysis.npks.n}-${data.analysis.npks.p}-${data.analysis.npks.k}${data.analysis.npks.s > 0 ? `-${data.analysis.npks.s}S` : ''}`}
                selected={selectedFields.has('analysis')}
                onToggle={() => toggleField('analysis')}
              />
            )}

            {data.analysis?.densityLbsPerGal && (
              <FieldRow
                field="density"
                label="Density"
                value={`${data.analysis.densityLbsPerGal} lbs/gal`}
                selected={selectedFields.has('density')}
                onToggle={() => toggleField('density')}
              />
            )}

            {data.activeIngredients && (
              <FieldRow
                field="activeIngredients"
                label="Active Ingredients"
                value={data.activeIngredients.slice(0, 100) + (data.activeIngredients.length > 100 ? '...' : '')}
                selected={selectedFields.has('activeIngredients')}
                onToggle={() => toggleField('activeIngredients')}
              />
            )}

            {data.generalNotes && (
              <FieldRow
                field="generalNotes"
                label="Product Description"
                value={data.generalNotes.slice(0, 100) + (data.generalNotes.length > 100 ? '...' : '')}
                selected={selectedFields.has('generalNotes')}
                onToggle={() => toggleField('generalNotes')}
              />
            )}

            {data.suggestedRoles && data.suggestedRoles.length > 0 && (
              <FieldRow
                field="roles"
                label="Suggested Roles"
                value={data.suggestedRoles.map(r => PRODUCT_ROLE_LABELS[r] || r).join(', ')}
                selected={selectedFields.has('roles')}
                onToggle={() => toggleField('roles')}
              />
            )}
          </div>

          {selectedFields.size === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No fields selected. Select fields to apply to the product.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={selectedFields.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Apply {selectedFields.size} Field{selectedFields.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

interface FieldRowProps {
  field: string;
  label: string;
  value: string;
  selected: boolean;
  onToggle: () => void;
}

const FieldRow: React.FC<FieldRowProps> = ({ field, label, value, selected, onToggle }) => (
  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
    selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
  }`}>
    <input
      type="checkbox"
      checked={selected}
      onChange={onToggle}
      className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
    />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground truncate">{value}</p>
    </div>
  </label>
);
