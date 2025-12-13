import React, { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp, Sparkles, AlertCircle } from 'lucide-react';
import type { RoleSuggestion, ProductRole } from '@/types/productIntelligence';
import { PRODUCT_ROLE_LABELS } from '@/types/productIntelligence';
import { cn } from '@/lib/utils';

interface RoleSuggestionPanelProps {
  suggestions: RoleSuggestion[];
  sourceInfo: string;
  onAcceptAll: (roles: ProductRole[]) => void;
  onAcceptSelected: (roles: ProductRole[]) => void;
  onCancel: () => void;
}

const CONFIDENCE_STYLES = {
  high: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/30',
    label: 'High',
    icon: '🟢',
  },
  medium: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/30',
    label: 'Medium',
    icon: '🟡',
  },
  low: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
    label: 'Low',
    icon: '🔴',
  },
};

export const RoleSuggestionPanel: React.FC<RoleSuggestionPanelProps> = ({
  suggestions,
  sourceInfo,
  onAcceptAll,
  onAcceptSelected,
  onCancel,
}) => {
  const [selectedRoles, setSelectedRoles] = useState<Set<ProductRole>>(
    new Set(suggestions.map(s => s.role))
  );
  const [expandedRoles, setExpandedRoles] = useState<Set<ProductRole>>(new Set());

  const toggleRole = (role: ProductRole) => {
    const newSelected = new Set(selectedRoles);
    if (newSelected.has(role)) {
      newSelected.delete(role);
    } else {
      newSelected.add(role);
    }
    setSelectedRoles(newSelected);
  };

  const toggleExpand = (role: ProductRole) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(role)) {
      newExpanded.delete(role);
    } else {
      newExpanded.add(role);
    }
    setExpandedRoles(newExpanded);
  };

  const handleAcceptSelected = () => {
    onAcceptSelected(Array.from(selectedRoles));
  };

  const handleAcceptAll = () => {
    onAcceptAll(suggestions.map(s => s.role));
  };

  if (suggestions.length === 0) {
    return (
      <div className="bg-muted/50 rounded-lg p-6 text-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No roles could be suggested. Try adding more product details like NPK analysis or category.
        </p>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-primary/5 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="font-medium text-foreground">AI Role Suggestions</h4>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{sourceInfo}</p>
      </div>

      {/* Suggestions List */}
      <div className="divide-y divide-border">
        {suggestions.map((suggestion) => {
          const style = CONFIDENCE_STYLES[suggestion.confidence];
          const isSelected = selectedRoles.has(suggestion.role);
          const isExpanded = expandedRoles.has(suggestion.role);

          return (
            <div key={suggestion.role} className="p-3">
              <div className="flex items-start gap-3">
                {/* Selection Checkbox */}
                <button
                  onClick={() => toggleRole(suggestion.role)}
                  className={cn(
                    'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    isSelected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                </button>

                {/* Role Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">
                      {PRODUCT_ROLE_LABELS[suggestion.role]}
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        style.bg,
                        style.text
                      )}
                    >
                      {style.icon} {style.label}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mt-1">
                    {suggestion.explanation}
                  </p>

                  {/* Evidence (expandable) */}
                  {suggestion.evidence.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleExpand(suggestion.role)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        {isExpanded ? 'Hide' : 'Show'} evidence ({suggestion.evidence.length})
                      </button>

                      {isExpanded && (
                        <ul className="mt-2 space-y-1 pl-4 border-l-2 border-primary/20">
                          {suggestion.evidence.map((e, i) => (
                            <li key={i} className="text-xs text-muted-foreground">
                              {e}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick accept/reject */}
                <button
                  onClick={() => toggleRole(suggestion.role)}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    isSelected
                      ? 'text-primary hover:bg-primary/10'
                      : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                  )}
                  title={isSelected ? 'Remove' : 'Add'}
                >
                  {isSelected ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="bg-muted/30 border-t border-border px-4 py-3 flex items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
        >
          Cancel
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {selectedRoles.size} of {suggestions.length} selected
          </span>
          
          {selectedRoles.size === suggestions.length ? (
            <button
              onClick={handleAcceptAll}
              className="flex items-center gap-1 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90"
            >
              <Check className="w-4 h-4" />
              Accept All
            </button>
          ) : (
            <button
              onClick={handleAcceptSelected}
              disabled={selectedRoles.size === 0}
              className="flex items-center gap-1 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Confirm Selected
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
