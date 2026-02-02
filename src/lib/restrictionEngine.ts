// ============================================================================
// Restriction Engine - Phase 6
// Validates planned and recorded applications against agronomic constraints
// Warnings act as a "thinking partner" - can be overridden with a reason
// ============================================================================

import type { ChemicalData, RotationRestriction, MaxRate } from '@/types/chemicalData';
import type { ApplicationRecord } from '@/types/applicationRecord';
import type { Season, ProductMaster } from '@/types';
import type { Field, FieldAssignment } from '@/types/field';

export type RestrictionType = 
  | 'rotation'
  | 'phi'
  | 'rei'
  | 'max-per-season'
  | 'max-per-application';

export type RestrictionSeverity = 'warning' | 'error';

export interface RestrictionViolation {
  id: string;
  type: RestrictionType;
  severity: RestrictionSeverity;
  productId: string;
  productName: string;
  fieldId?: string;
  fieldName?: string;
  message: string;
  details: string;
  canOverride: boolean;
}

export interface RestrictionCheckContext {
  season: Season;
  fields: Field[];
  fieldAssignments: FieldAssignment[];
  applicationRecords: ApplicationRecord[];
  productMasters: ProductMaster[];
  historicalSeasons?: Season[];
}

export interface PlannedApplication {
  productId: string;
  rate: number;
  rateUnit: string;
  acres: number;
}

// ============================================================================
// Core Validation Functions
// ============================================================================

/**
 * Check all restrictions for a planned or recorded application
 */
export function checkRestrictions(
  context: RestrictionCheckContext,
  fieldId: string,
  cropId: string,
  timingId: string,
  dateApplied: string,
  products: PlannedApplication[],
  harvestDate?: string
): RestrictionViolation[] {
  const violations: RestrictionViolation[] = [];
  
  const field = context.fields.find(f => f.id === fieldId);
  const fieldName = field?.name || 'Unknown Field';

  for (const app of products) {
    const product = context.productMasters.find(p => p.id === app.productId);
    if (!product) continue;

    const chemData = product.chemicalData as ChemicalData | undefined;
    if (!chemData?.restrictions) continue;

    const restrictions = chemData.restrictions;

    // 1. Check rotation restrictions
    const rotationViolations = checkRotationRestrictions(
      context,
      fieldId,
      fieldName,
      product,
      restrictions.rotationRestrictions
    );
    violations.push(...rotationViolations);

    // 2. Check PHI (Pre-Harvest Interval)
    if (restrictions.phiDays && harvestDate) {
      const phiViolation = checkPHI(
        fieldId,
        fieldName,
        product,
        dateApplied,
        harvestDate,
        restrictions.phiDays
      );
      if (phiViolation) violations.push(phiViolation);
    }

    // 3. Check REI (Re-Entry Interval) - informational only
    if (restrictions.reiHours) {
      const reiWarning = createREIWarning(
        fieldId,
        fieldName,
        product,
        dateApplied,
        restrictions.reiHours
      );
      violations.push(reiWarning);
    }

    // 4. Check seasonal max rate
    if (restrictions.maxRatePerSeason) {
      const seasonalViolation = checkSeasonalMaxRate(
        context,
        fieldId,
        fieldName,
        cropId,
        product,
        app.rate,
        app.rateUnit,
        app.acres,
        restrictions.maxRatePerSeason
      );
      if (seasonalViolation) violations.push(seasonalViolation);
    }

    // 5. Check max rate per application
    if (restrictions.maxRatePerApplication) {
      const rateViolation = checkMaxRatePerApplication(
        fieldId,
        fieldName,
        product,
        app.rate,
        app.rateUnit,
        restrictions.maxRatePerApplication
      );
      if (rateViolation) violations.push(rateViolation);
    }

    // 6. Check max applications per season
    if (restrictions.maxApplicationsPerSeason) {
      const countViolation = checkMaxApplicationsPerSeason(
        context,
        fieldId,
        fieldName,
        cropId,
        product,
        restrictions.maxApplicationsPerSeason
      );
      if (countViolation) violations.push(countViolation);
    }
  }

  return violations;
}

// ============================================================================
// Individual Restriction Checks
// ============================================================================

function checkRotationRestrictions(
  context: RestrictionCheckContext,
  fieldId: string,
  fieldName: string,
  product: ProductMaster,
  rotationRestrictions?: RotationRestriction[]
): RestrictionViolation[] {
  if (!rotationRestrictions || rotationRestrictions.length === 0) return [];
  
  const violations: RestrictionViolation[] = [];
  
  // Get historical crop assignments for this field
  const historicalAssignments = getFieldCropHistory(context, fieldId);
  
  for (const restriction of rotationRestrictions) {
    const restrictedCrop = restriction.crop.toLowerCase();
    const restrictionDays = restriction.days || (restriction.months ? restriction.months * 30 : 0);
    
    // Check if restricted crop was grown within the restriction period
    for (const historyItem of historicalAssignments) {
      if (historyItem.cropName.toLowerCase().includes(restrictedCrop)) {
        const daysSince = Math.floor(
          (Date.now() - new Date(historyItem.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSince < restrictionDays) {
          violations.push({
            id: `rotation-${product.id}-${fieldId}-${restriction.crop}`,
            type: 'rotation',
            severity: 'warning',
            productId: product.id,
            productName: product.name,
            fieldId,
            fieldName,
            message: `Rotation restriction: ${restriction.crop}`,
            details: `${product.name} has a ${restrictionDays}-day rotation restriction for ${restriction.crop}. ` +
                     `${restriction.crop} was grown on this field ${daysSince} days ago.` +
                     (restriction.notes ? ` Note: ${restriction.notes}` : ''),
            canOverride: true,
          });
        }
      }
    }
  }
  
  return violations;
}

function checkPHI(
  fieldId: string,
  fieldName: string,
  product: ProductMaster,
  dateApplied: string,
  harvestDate: string,
  phiDays: number
): RestrictionViolation | null {
  const applyDate = new Date(dateApplied);
  const harvest = new Date(harvestDate);
  
  const daysToHarvest = Math.floor(
    (harvest.getTime() - applyDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysToHarvest < phiDays) {
    return {
      id: `phi-${product.id}-${fieldId}`,
      type: 'phi',
      severity: 'error',
      productId: product.id,
      productName: product.name,
      fieldId,
      fieldName,
      message: `PHI violation: ${phiDays} days required`,
      details: `${product.name} requires a ${phiDays}-day pre-harvest interval. ` +
               `Application on ${dateApplied} allows only ${daysToHarvest} days before harvest on ${harvestDate}.`,
      canOverride: true,
    };
  }
  
  return null;
}

function createREIWarning(
  fieldId: string,
  fieldName: string,
  product: ProductMaster,
  dateApplied: string,
  reiHours: number
): RestrictionViolation {
  const reentryDate = new Date(dateApplied);
  reentryDate.setHours(reentryDate.getHours() + reiHours);
  
  return {
    id: `rei-${product.id}-${fieldId}`,
    type: 'rei',
    severity: 'warning',
    productId: product.id,
    productName: product.name,
    fieldId,
    fieldName,
    message: `REI: ${reiHours} hours`,
    details: `${product.name} has a ${reiHours}-hour restricted entry interval. ` +
             `Do not enter field until ${reentryDate.toLocaleString()}.`,
    canOverride: false, // Informational only
  };
}

function checkSeasonalMaxRate(
  context: RestrictionCheckContext,
  fieldId: string,
  fieldName: string,
  cropId: string,
  product: ProductMaster,
  plannedRate: number,
  plannedUnit: string,
  acres: number,
  maxRate: MaxRate
): RestrictionViolation | null {
  // Calculate already applied this season for this field
  const appliedThisSeason = context.applicationRecords
    .filter(ar => 
      ar.fieldId === fieldId && 
      ar.cropId === cropId &&
      ar.seasonId === context.season.id
    )
    .reduce((total, record) => {
      const productRecord = record.products.find(p => p.productId === product.id);
      if (productRecord) {
        return total + productRecord.actualRate;
      }
      return total;
    }, 0);

  const totalAfterApplication = appliedThisSeason + plannedRate;
  
  // Simplified unit comparison (in production, would need full unit conversion)
  if (normalizeUnit(plannedUnit) === normalizeUnit(maxRate.unit)) {
    if (totalAfterApplication > maxRate.value) {
      return {
        id: `max-season-${product.id}-${fieldId}`,
        type: 'max-per-season',
        severity: 'error',
        productId: product.id,
        productName: product.name,
        fieldId,
        fieldName,
        message: `Exceeds seasonal max: ${maxRate.value} ${maxRate.unit}`,
        details: `${product.name} has a seasonal maximum of ${maxRate.value} ${maxRate.unit}. ` +
                 `Already applied: ${appliedThisSeason.toFixed(2)} ${plannedUnit}. ` +
                 `This application (${plannedRate} ${plannedUnit}) would bring total to ${totalAfterApplication.toFixed(2)} ${plannedUnit}.`,
        canOverride: true,
      };
    }
  }
  
  return null;
}

function checkMaxRatePerApplication(
  fieldId: string,
  fieldName: string,
  product: ProductMaster,
  rate: number,
  rateUnit: string,
  maxRate: MaxRate
): RestrictionViolation | null {
  // Simplified unit comparison
  if (normalizeUnit(rateUnit) === normalizeUnit(maxRate.unit)) {
    if (rate > maxRate.value) {
      return {
        id: `max-app-${product.id}-${fieldId}`,
        type: 'max-per-application',
        severity: 'error',
        productId: product.id,
        productName: product.name,
        fieldId,
        fieldName,
        message: `Rate exceeds max per application: ${maxRate.value} ${maxRate.unit}`,
        details: `${product.name} has a maximum rate of ${maxRate.value} ${maxRate.unit} per application. ` +
                 `Planned rate: ${rate} ${rateUnit}.`,
        canOverride: true,
      };
    }
  }
  
  return null;
}

function checkMaxApplicationsPerSeason(
  context: RestrictionCheckContext,
  fieldId: string,
  fieldName: string,
  cropId: string,
  product: ProductMaster,
  maxApplications: number
): RestrictionViolation | null {
  const applicationCount = context.applicationRecords
    .filter(ar => 
      ar.fieldId === fieldId && 
      ar.cropId === cropId &&
      ar.seasonId === context.season.id &&
      ar.products.some(p => p.productId === product.id)
    )
    .length;

  if (applicationCount >= maxApplications) {
    return {
      id: `max-apps-${product.id}-${fieldId}`,
      type: 'max-per-season',
      severity: 'error',
      productId: product.id,
      productName: product.name,
      fieldId,
      fieldName,
      message: `Max applications reached: ${maxApplications} per season`,
      details: `${product.name} allows a maximum of ${maxApplications} applications per season. ` +
               `Already applied ${applicationCount} times on this field.`,
      canOverride: true,
    };
  }
  
  return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

interface CropHistoryItem {
  cropName: string;
  date: string;
  seasonYear: number;
}

function getFieldCropHistory(
  context: RestrictionCheckContext,
  fieldId: string
): CropHistoryItem[] {
  const history: CropHistoryItem[] = [];
  
  // Get from current season
  const currentAssignments = context.fieldAssignments.filter(
    fa => fa.fieldId === fieldId && fa.seasonId === context.season.id
  );
  
  for (const assignment of currentAssignments) {
    const crop = context.season.crops?.find(c => c.id === assignment.cropId);
    if (crop) {
      const createdAt = context.season.createdAt;
      history.push({
        cropName: crop.name,
        date: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
        seasonYear: context.season.year,
      });
    }
    
    // Also check previous crop name from assignment
    if (assignment.previousCropName) {
      history.push({
        cropName: assignment.previousCropName,
        date: new Date(context.season.year - 1, 0, 1).toISOString(),
        seasonYear: context.season.year - 1,
      });
    }
  }
  
  // Get from historical seasons if provided
  if (context.historicalSeasons) {
    for (const historicalSeason of context.historicalSeasons) {
      const historicalAssignments = context.fieldAssignments.filter(
        fa => fa.fieldId === fieldId && fa.seasonId === historicalSeason.id
      );
      
      for (const assignment of historicalAssignments) {
        const crop = historicalSeason.crops?.find(c => c.id === assignment.cropId);
        if (crop) {
          const createdAt = historicalSeason.createdAt;
          history.push({
            cropName: crop.name,
            date: typeof createdAt === 'string' ? createdAt : new Date(historicalSeason.year, 0, 1).toISOString(),
            seasonYear: historicalSeason.year,
          });
        }
      }
    }
  }
  
  return history;
}

function normalizeUnit(unit: string): string {
  const lowerUnit = unit.toLowerCase().trim();
  
  // Normalize common rate units
  if (lowerUnit.includes('oz') && lowerUnit.includes('ac')) return 'oz/ac';
  if (lowerUnit.includes('pt') && lowerUnit.includes('ac')) return 'pt/ac';
  if (lowerUnit.includes('qt') && lowerUnit.includes('ac')) return 'qt/ac';
  if (lowerUnit.includes('gal') && lowerUnit.includes('ac')) return 'gal/ac';
  if (lowerUnit.includes('lb') && lowerUnit.includes('ac')) return 'lb/ac';
  if (lowerUnit.includes('lb') && lowerUnit.includes('ai')) return 'lb ai/ac';
  
  return lowerUnit;
}

// ============================================================================
// Utility exports
// ============================================================================

/**
 * Filter violations to show only overridable ones
 */
export function getOverridableViolations(violations: RestrictionViolation[]): RestrictionViolation[] {
  return violations.filter(v => v.canOverride);
}

/**
 * Filter violations by severity
 */
export function getViolationsBySeverity(
  violations: RestrictionViolation[],
  severity: RestrictionSeverity
): RestrictionViolation[] {
  return violations.filter(v => v.severity === severity);
}

/**
 * Group violations by product
 */
export function groupViolationsByProduct(
  violations: RestrictionViolation[]
): Record<string, RestrictionViolation[]> {
  return violations.reduce((acc, v) => {
    if (!acc[v.productId]) acc[v.productId] = [];
    acc[v.productId].push(v);
    return acc;
  }, {} as Record<string, RestrictionViolation[]>);
}

/**
 * Check if any violations are blocking (errors that should prevent saving)
 */
export function hasBlockingViolations(violations: RestrictionViolation[]): boolean {
  return violations.some(v => v.severity === 'error' && v.canOverride);
}
