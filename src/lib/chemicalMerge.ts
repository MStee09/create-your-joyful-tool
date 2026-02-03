// ============================================================================
// Chemical Data Merge Logic
// Handles Label vs SDS merge strategy - Label is authoritative for agronomic data
// ============================================================================

import type { ChemicalData, Restrictions, ActiveIngredient, AdjuvantRequirement, RotationRestriction } from '@/types/chemicalData';

export type DocumentSource = 'label' | 'sds';

/**
 * Merge extracted chemical data with existing data.
 * 
 * Label Priority (always wins):
 * - Active ingredients, concentrations
 * - Rate ranges, by-condition rates
 * - PHI (all crop-specific values)
 * - REI
 * - Max rates, max applications
 * - Rotation restrictions
 * - Carrier volumes
 * - Adjuvant requirements
 * - Application timing/methods
 * - Buffer zones (including endangered species)
 * 
 * SDS Supplement (fills gaps only):
 * - Signal word (if missing from label)
 * - First aid/emergency info
 * - PPE requirements
 * - Storage/handling (supplemental)
 */
export function mergeChemicalData(
  existing: ChemicalData | undefined,
  extracted: ChemicalData,
  source: DocumentSource
): ChemicalData {
  if (source === 'label') {
    // Label is authoritative - full replacement of agronomic fields
    return {
      // From extracted label
      activeIngredients: extracted.activeIngredients || existing?.activeIngredients,
      restrictions: mergeRestrictions(existing?.restrictions, extracted.restrictions, 'label'),
      mixingOrder: extracted.mixingOrder || existing?.mixingOrder,
      compatibility: extracted.compatibility || existing?.compatibility,
      formulationType: extracted.formulationType || existing?.formulationType,
      epaRegNumber: extracted.epaRegNumber || existing?.epaRegNumber,
      subcategory: extracted.subcategory || existing?.subcategory,
      rateRange: extracted.rateRange || existing?.rateRange,
      applicationRequirements: extracted.applicationRequirements || existing?.applicationRequirements,
      adjuvantRequirements: extracted.adjuvantRequirements || existing?.adjuvantRequirements,
      targetPests: extracted.targetPests || existing?.targetPests,
      targetWeeds: extracted.targetWeeds || existing?.targetWeeds,
      
      // Signal word: prefer label, fallback to existing (may have come from SDS)
      signalWord: extracted.signalWord || existing?.signalWord,
      
      // Extraction metadata
      extractedAt: new Date().toISOString(),
      extractionConfidence: extracted.extractionConfidence || 'medium',
      extractionNotes: extracted.extractionNotes,
    };
  }
  
  // SDS only fills gaps - never overwrites agronomic data
  return {
    // Keep all existing agronomic data
    activeIngredients: existing?.activeIngredients || extracted.activeIngredients,
    restrictions: existing?.restrictions || extracted.restrictions,
    mixingOrder: existing?.mixingOrder || extracted.mixingOrder,
    compatibility: existing?.compatibility || extracted.compatibility,
    formulationType: existing?.formulationType || extracted.formulationType,
    epaRegNumber: existing?.epaRegNumber || extracted.epaRegNumber,
    subcategory: existing?.subcategory || extracted.subcategory,
    rateRange: existing?.rateRange,
    applicationRequirements: existing?.applicationRequirements,
    adjuvantRequirements: existing?.adjuvantRequirements,
    targetPests: existing?.targetPests,
    targetWeeds: existing?.targetWeeds,
    
    // SDS can provide signal word if missing
    signalWord: existing?.signalWord || extracted.signalWord,
    
    // Keep existing extraction metadata
    extractedAt: existing?.extractedAt || new Date().toISOString(),
    extractionConfidence: existing?.extractionConfidence || 'medium',
    extractionNotes: existing?.extractionNotes 
      ? `${existing.extractionNotes}\nSDS supplemental data added.`
      : 'SDS supplemental data added.',
  };
}

/**
 * Merge restrictions with source-aware logic
 */
function mergeRestrictions(
  existing: Restrictions | undefined,
  extracted: Restrictions | undefined,
  source: DocumentSource
): Restrictions | undefined {
  if (!extracted && !existing) return undefined;
  if (!extracted) return existing;
  if (!existing || source === 'label') {
    // Label replaces all restriction data
    return extracted;
  }
  
  // SDS only fills gaps
  return {
    phiDays: existing.phiDays ?? extracted.phiDays,
    phiByCrop: existing.phiByCrop || extracted.phiByCrop,
    rotationRestrictions: existing.rotationRestrictions || extracted.rotationRestrictions,
    grazingRestrictions: existing.grazingRestrictions || extracted.grazingRestrictions,
    maxRatePerApplication: existing.maxRatePerApplication || extracted.maxRatePerApplication,
    maxRatePerSeason: existing.maxRatePerSeason || extracted.maxRatePerSeason,
    maxApplicationsPerSeason: existing.maxApplicationsPerSeason ?? extracted.maxApplicationsPerSeason,
    minDaysBetweenApplications: existing.minDaysBetweenApplications ?? extracted.minDaysBetweenApplications,
    reiHours: existing.reiHours ?? extracted.reiHours,
    bufferZoneFeet: existing.bufferZoneFeet ?? extracted.bufferZoneFeet,
    bufferZoneAerialFeet: existing.bufferZoneAerialFeet ?? extracted.bufferZoneAerialFeet,
    bufferZoneGroundFeet: existing.bufferZoneGroundFeet ?? extracted.bufferZoneGroundFeet,
    endangeredSpeciesBufferAerialFeet: existing.endangeredSpeciesBufferAerialFeet ?? extracted.endangeredSpeciesBufferAerialFeet,
    endangeredSpeciesBufferGroundFeet: existing.endangeredSpeciesBufferGroundFeet ?? extracted.endangeredSpeciesBufferGroundFeet,
    groundwaterAdvisory: existing.groundwaterAdvisory ?? extracted.groundwaterAdvisory,
    groundwaterNotes: existing.groundwaterNotes || extracted.groundwaterNotes,
    pollinator: existing.pollinator || extracted.pollinator,
    rainfast: existing.rainfast || extracted.rainfast,
    notes: existing.notes || extracted.notes,
  };
}

/**
 * Check if chemical data has crop-specific PHI
 */
export function hasCropSpecificPHI(chemicalData?: ChemicalData): boolean {
  if (!chemicalData?.restrictions) return false;
  return (
    (chemicalData.restrictions.phiDays === null || chemicalData.restrictions.phiDays === undefined) &&
    Array.isArray(chemicalData.restrictions.phiByCrop) &&
    chemicalData.restrictions.phiByCrop.length > 0
  );
}

/**
 * Check if chemical data has rate-by-condition data
 */
export function hasRateByCondition(chemicalData?: ChemicalData): boolean {
  return (
    chemicalData?.rateRange?.byCondition !== undefined &&
    chemicalData.rateRange.byCondition.length > 0
  );
}

/**
 * Check if chemical data has aerial/ground split for carrier or buffers
 */
export function hasAerialGroundSplit(chemicalData?: ChemicalData): boolean {
  if (!chemicalData) return false;
  const appReqs = chemicalData.applicationRequirements;
  const restrictions = chemicalData.restrictions;
  
  return (
    (appReqs?.carrierGpaMinAerial !== undefined && appReqs?.carrierGpaMinGround !== undefined) ||
    (restrictions?.bufferZoneAerialFeet !== undefined && restrictions?.bufferZoneGroundFeet !== undefined) ||
    (restrictions?.endangeredSpeciesBufferAerialFeet !== undefined && restrictions?.endangeredSpeciesBufferGroundFeet !== undefined)
  );
}

/**
 * Get PHI display value (single or "varies")
 */
export function getPHIDisplay(chemicalData?: ChemicalData): string {
  if (!chemicalData?.restrictions) return '—';
  
  if (hasCropSpecificPHI(chemicalData)) {
    const phiList = chemicalData.restrictions.phiByCrop!;
    const min = Math.min(...phiList.map(p => p.days));
    const max = Math.max(...phiList.map(p => p.days));
    return min === max ? `${min} days` : `${min}-${max} days (varies by crop)`;
  }
  
  if (chemicalData.restrictions.phiDays !== undefined && chemicalData.restrictions.phiDays !== null) {
    return `${chemicalData.restrictions.phiDays} days`;
  }
  
  return '—';
}
