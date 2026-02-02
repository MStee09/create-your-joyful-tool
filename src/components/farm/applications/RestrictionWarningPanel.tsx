import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { RestrictionViolation, RestrictionType } from '@/lib/restrictionEngine';
import type { OverriddenWarning } from '@/types/applicationRecord';

interface RestrictionWarningPanelProps {
  violations: RestrictionViolation[];
  overrides: Record<string, { reason: string; confirmed: boolean }>;
  onOverrideChange: (violationId: string, reason: string, confirmed: boolean) => void;
}

const SEVERITY_ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
};

const SEVERITY_COLORS = {
  error: 'text-destructive',
  warning: 'text-amber-600',
};

const SEVERITY_BG = {
  error: 'bg-destructive/10 border-destructive/30',
  warning: 'bg-amber-50 border-amber-200',
};

const TYPE_LABELS: Record<RestrictionType, string> = {
  rotation: 'Rotation Restriction',
  phi: 'Pre-Harvest Interval',
  rei: 'Re-Entry Interval',
  'max-per-season': 'Seasonal Maximum',
  'max-per-application': 'Application Rate Limit',
};

export const RestrictionWarningPanel: React.FC<RestrictionWarningPanelProps> = ({
  violations,
  overrides,
  onOverrideChange,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (violations.length === 0) return null;

  const errors = violations.filter(v => v.severity === 'error' && v.canOverride);
  const warnings = violations.filter(v => v.severity === 'warning' && v.canOverride);
  const info = violations.filter(v => !v.canOverride);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <span>Restriction Warnings ({violations.length})</span>
      </div>

      {/* Errors (blocking) */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-destructive font-medium">
            Blocking Issues — Must acknowledge to continue
          </p>
          {errors.map(violation => (
            <ViolationCard
              key={violation.id}
              violation={violation}
              isExpanded={expandedIds.has(violation.id)}
              onToggle={() => toggleExpanded(violation.id)}
              override={overrides[violation.id]}
              onOverrideChange={(reason, confirmed) => 
                onOverrideChange(violation.id, reason, confirmed)
              }
            />
          ))}
        </div>
      )}

      {/* Warnings (can proceed) */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-amber-600 font-medium">
            Warnings — Review before proceeding
          </p>
          {warnings.map(violation => (
            <ViolationCard
              key={violation.id}
              violation={violation}
              isExpanded={expandedIds.has(violation.id)}
              onToggle={() => toggleExpanded(violation.id)}
              override={overrides[violation.id]}
              onOverrideChange={(reason, confirmed) => 
                onOverrideChange(violation.id, reason, confirmed)
              }
            />
          ))}
        </div>
      )}

      {/* Info (REI, etc.) */}
      {info.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">
            Informational
          </p>
          {info.map(violation => (
            <div 
              key={violation.id}
              className="flex items-start gap-2 p-2 bg-muted rounded text-sm"
            >
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">{violation.productName}: </span>
                <span className="text-muted-foreground">{violation.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface ViolationCardProps {
  violation: RestrictionViolation;
  isExpanded: boolean;
  onToggle: () => void;
  override?: { reason: string; confirmed: boolean };
  onOverrideChange: (reason: string, confirmed: boolean) => void;
}

const ViolationCard: React.FC<ViolationCardProps> = ({
  violation,
  isExpanded,
  onToggle,
  override,
  onOverrideChange,
}) => {
  const Icon = SEVERITY_ICONS[violation.severity];
  const colorClass = SEVERITY_COLORS[violation.severity];
  const bgClass = SEVERITY_BG[violation.severity];
  const isConfirmed = override?.confirmed || false;

  return (
    <div className={`border rounded-lg overflow-hidden ${isConfirmed ? 'opacity-60' : ''} ${bgClass}`}>
      <button
        type="button"
        className="w-full flex items-start gap-2 p-3 text-left"
        onClick={onToggle}
      >
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${colorClass}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{violation.productName}</span>
            {violation.fieldName && (
              <span className="text-xs text-muted-foreground">• {violation.fieldName}</span>
            )}
            {isConfirmed && (
              <Check className="w-4 h-4 text-green-600 ml-auto" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{violation.message}</p>
          <span className="text-xs text-muted-foreground">
            {TYPE_LABELS[violation.type]}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-0 space-y-3 border-t">
          <p className="text-sm text-muted-foreground pt-3">
            {violation.details}
          </p>

          {violation.canOverride && (
            <div className="space-y-2">
              <Textarea
                placeholder="Enter reason for override (required)..."
                value={override?.reason || ''}
                onChange={(e) => onOverrideChange(e.target.value, override?.confirmed || false)}
                rows={2}
                className="text-sm"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={isConfirmed}
                  onCheckedChange={(checked) => 
                    onOverrideChange(override?.reason || '', checked === true)
                  }
                  disabled={!override?.reason?.trim()}
                />
                <span className="text-sm">
                  I understand this restriction and accept responsibility
                </span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Convert overrides state to OverriddenWarning[] for saving
 */
export function buildOverriddenWarnings(
  violations: RestrictionViolation[],
  overrides: Record<string, { reason: string; confirmed: boolean }>
): OverriddenWarning[] {
  return violations
    .filter(v => v.canOverride && overrides[v.id]?.confirmed)
    .map(v => ({
      type: v.type as OverriddenWarning['type'],
      productId: v.productId,
      productName: v.productName,
      message: v.message,
      overrideReason: overrides[v.id].reason,
      overriddenAt: new Date().toISOString(),
    }));
}

/**
 * Check if all blocking violations have been overridden
 */
export function allBlockingViolationsOverridden(
  violations: RestrictionViolation[],
  overrides: Record<string, { reason: string; confirmed: boolean }>
): boolean {
  const blockingViolations = violations.filter(v => v.severity === 'error' && v.canOverride);
  return blockingViolations.every(v => overrides[v.id]?.confirmed && overrides[v.id]?.reason?.trim());
}
