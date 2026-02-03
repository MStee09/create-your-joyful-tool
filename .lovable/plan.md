

# Enhanced Chemical Label Extraction

## Overview

This plan addresses the gaps identified in the current AI extraction system for chemical product labels. The user's analysis of the Outlook Herbicide label revealed significant missing data:
- Crop-specific PHI (Pre-Harvest Intervals) not extracted
- Rate ranges by soil type not captured
- Carrier volume requirements missing
- Adjuvant recommendations not extracted
- Buffer zones for endangered species missing
- Manufacturer not reliably extracted
- SDS potentially overwriting label data

---

## Current State

### What the Extract-Label Edge Function Does Now
- Extracts basic chemical data structure (active ingredients, PHI, REI)
- Uses a single `phiDays` field (not crop-specific)
- Basic rate extraction without soil-type conditions
- No dedicated adjuvant extraction
- No carrier volume extraction
- No buffer zone differentiation (aerial vs ground)
- Treats all document types the same (no label vs SDS distinction)

### Data Types Already Support (Partially)
- `ChemicalData.adjuvantRequirements` - array exists but not populated
- `ChemicalData.applicationRequirements` - has carrier fields but not aerial/ground split
- `ChemicalData.rateRange` - exists but no by-condition array
- `ChemicalData.restrictions.rotationRestrictions` - exists but conditions field rarely populated

---

## Implementation Plan

### Phase 1: Extended ChemicalData Types

**Modify `src/types/chemicalData.ts`:**

Add new interfaces for crop-specific data:

```typescript
// Crop-specific PHI
interface CropSpecificPHI {
  crop: string;
  days: number;
  notes?: string;
}

// Rate by condition (soil type, etc.)
interface RateByCondition {
  condition: string; // "Coarse soils, <3% OM"
  min?: number;
  max?: number;
  unit: string;
  notes?: string;
}

// Extended Restrictions
interface Restrictions {
  // Existing...
  phiDays?: number | null; // null = varies by crop
  phiByCrop?: CropSpecificPHI[];
  
  // Buffer zones
  bufferZoneAerialFeet?: number;
  bufferZoneGroundFeet?: number;
  endangeredSpeciesBufferAerialFeet?: number;
  endangeredSpeciesBufferGroundFeet?: number;
}

// Extended RateRange
interface RateRange {
  // Existing...
  byCondition?: RateByCondition[];
}

// Extended ApplicationRequirements
interface ApplicationRequirements {
  // Existing carrier fields...
  carrierGpaMinAerial?: number;
  carrierGpaMinGround?: number;
  applicationMethods?: string[]; // "Preplant", "Preemergence", etc.
}
```

### Phase 2: Enhanced Extraction Prompt

**Modify `supabase/functions/extract-label/index.ts`:**

Update `EXTRACTION_PROMPT` to be more comprehensive:

Key additions:
1. **Manufacturer extraction** - Explicitly state it's always on page 1
2. **Crop-specific PHI** - Array format when PHI varies
3. **Rate-by-condition** - Capture soil type variations
4. **Carrier volume split** - Aerial vs ground minimums
5. **Adjuvant extraction** - COC, NIS, AMS, UAN with rates/requirements
6. **Buffer zones** - Standard vs endangered species, aerial vs ground
7. **Application methods** - Pre-emerge, post-emerge, timing windows
8. **Grazing restrictions** - Often missed

### Phase 3: Label vs SDS Merge Logic

**Modify `src/components/farm/chemical/ChemicalProductDocumentsTab.tsx`:**

Add intelligent merge logic:

```text
Label Priority (always wins):
- Active ingredients, concentrations
- Rate ranges, by-condition rates
- PHI (all crop-specific values)
- REI
- Max rates, max applications
- Rotation restrictions
- Carrier volumes
- Adjuvant requirements
- Application timing/methods
- Buffer zones (including endangered species)

SDS Supplement (fills gaps only):
- Signal word (if missing from label)
- First aid/emergency info
- PPE requirements
- Storage/handling (supplemental)
```

The merge function will:
1. Check document type being uploaded (label vs SDS)
2. If label: fully replace agronomic fields
3. If SDS: only fill null fields, never overwrite

### Phase 4: Review Modal for Chemical Data

**Create `src/components/farm/ChemicalDataReviewModal.tsx`:**

New modal for reviewing extracted chemical data with:

1. **Active Ingredients Section**
   - Editable name, concentration, MOA group
   - Add/remove ingredients

2. **Rate Range Section**
   - Min/max/typical with unit
   - Expandable "By Condition" table for soil-type rates

3. **Restrictions Section**
   - PHI display with crop-specific toggle
   - Table for crop-specific PHI when applicable
   - REI, max rates, max apps
   - Buffer zones (standard vs endangered species)

4. **Adjuvants Section**
   - Table of adjuvant requirements
   - Required vs recommended indicator
   - Rate + unit

5. **Carrier & Application Section**
   - Aerial/ground minimums
   - Droplet size
   - Application methods checkboxes

6. **Confidence Indicators**
   - Per-field "?" icon for low-confidence values
   - Overall extraction confidence badge

### Phase 5: Update ChemicalProductRestrictionsTab

**Modify `src/components/farm/chemical/ChemicalProductRestrictionsTab.tsx`:**

Update to display new data:

1. Crop-specific PHI table (when applicable)
2. Buffer zones section with aerial/ground breakdown
3. Endangered species restrictions callout
4. Grazing restrictions table

### Phase 6: Update ChemicalProductRatesTab

**Modify `src/components/farm/chemical/ChemicalProductRatesTab.tsx`:**

Update to display:

1. Rate-by-condition table showing soil type variations
2. Carrier volume requirements (aerial vs ground)
3. Adjuvant requirements table

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/farm/ChemicalDataReviewModal.tsx` | Review modal for extracted chemical data |
| `src/lib/chemicalMerge.ts` | Label vs SDS merge logic |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/chemicalData.ts` | Extended interfaces for crop-specific PHI, rate conditions, buffer zones, aerial/ground splits |
| `supabase/functions/extract-label/index.ts` | Enhanced extraction prompt with all fields |
| `src/components/farm/chemical/ChemicalProductDocumentsTab.tsx` | Add merge logic, trigger review modal |
| `src/components/farm/chemical/ChemicalProductRestrictionsTab.tsx` | Display crop-specific PHI, buffer zones |
| `src/components/farm/chemical/ChemicalProductRatesTab.tsx` | Display rate-by-condition, adjuvants |

### Enhanced Extraction Prompt (Key Sections)

```text
IDENTITY EXTRACTION:
- Manufacturer is ALWAYS on page 1 - extract it
- EPA Reg. No. format: XXXXX-XXX
- Formulation type often in product name

PHI EXTRACTION:
- If PHI varies by crop, set phiDays to null
- Populate phiByCrop array with ALL crop-specific intervals
- Common crops: corn, soybeans, wheat, sorghum, cotton, etc.

RATE EXTRACTION:
- Look for rate tables with soil type columns
- "Coarse soils" vs "Medium/Fine soils"
- "<3% OM" vs "≥3% OM"
- Extract ALL rate variations

ADJUVANT EXTRACTION:
- Look for "Adjuvants", "Surfactants", "Tank Mix Partners" sections
- COC: crop oil concentrate (1 qt/ac typical)
- NIS: non-ionic surfactant (0.25% v/v typical)
- AMS: ammonium sulfate (2-4 lb/100 gal typical)
- MSO: methylated seed oil

BUFFER ZONES:
- Standard buffer zones (all applications)
- Endangered species buffer zones (separate section)
- Differentiate aerial vs ground application buffers
```

### Merge Logic Detail

```typescript
function mergeChemicalData(
  existing: ChemicalData | undefined,
  extracted: ChemicalData,
  source: 'label' | 'sds'
): ChemicalData {
  if (source === 'label') {
    // Label is authoritative - full replacement
    return {
      ...extracted,
      // Keep any SDS-only safety data
      signalWord: extracted.signalWord || existing?.signalWord,
    };
  }
  
  // SDS only fills gaps - never overwrites
  return {
    ...existing,
    signalWord: existing?.signalWord || extracted.signalWord,
    // Only add SDS data where existing is null/undefined
  };
}
```

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Extended Types | Small |
| Phase 2: Enhanced Prompt | Medium |
| Phase 3: Merge Logic | Small |
| Phase 4: Review Modal | Large |
| Phase 5: Restrictions Tab | Medium |
| Phase 6: Rates Tab | Medium |

**Total: 4-5 sessions**

---

## Expected Improvements

After implementation, the Outlook Herbicide example would extract:

| Field | Before | After |
|-------|--------|-------|
| Manufacturer | Missing | BASF Corporation |
| PHI | "null days" | Array of 9 crop-specific values |
| Rate Range | Not shown | "12-21 fl oz/ac with soil conditions" |
| Carrier Volume | Missing | "2+ gal/ac aerial, 5+ gal/ac ground" |
| Adjuvants | Missing | COC, NIS, AMS, UAN with rates |
| Buffer Zones | Missing | "150 ft aerial, 35 ft ground (endangered species)" |

