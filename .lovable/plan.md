

# Enhanced Mixing Tab Redesign

## Overview

This plan transforms the Mixing tab from a data display layout into a "field-ready checklist" designed for the person filling the sprayer. The goal is to show critical safety/compatibility info at the top, followed by actionable mixing steps, with adjuvant and water quality details integrated in context.

---

## Current State

The existing `ChemicalProductMixingTab.tsx` has:
- Mixing Order card (shows priority number + category)
- Compatibility card (synergists, antagonists, incompatible, jar test)
- Water Quality card (pH range, hardness)

**What's missing:**
- Pre-mix checklist with prioritized warnings
- Full tank mix sequence (all 8 steps, not just this product)
- Adjuvants displayed in mixing context (currently only on Rates tab)
- Carrier volume (currently only on Rates tab)
- Crop-specific mixing warnings

---

## Implementation Plan

### Phase 1: Extend ChemicalData Types

**Modify `src/types/chemicalData.ts`:**

Add new interfaces for enhanced mixing data:

```typescript
// Crop-specific mixing warning
export interface CropMixingWarning {
  crop: string;
  warning: string;
  severity: 'caution' | 'avoid' | 'prohibited';
}

// Carrier volume configuration
export interface CarrierVolume {
  aerialMin?: number;
  groundMin?: number;
  chemigationRange?: string;
  notes?: string;
}

// Extended Compatibility interface
export interface Compatibility {
  // Existing fields...
  antagonists?: string[];
  synergists?: string[];
  incompatible?: string[];
  jarTest?: boolean;
  waterQuality?: WaterQuality;
  notes?: string;
  
  // New fields
  cautionWith?: string[];              // "May cause issues" warnings
  cropMixingWarnings?: CropMixingWarning[];  // Per-crop tank mix warnings
}

// Extended ChemicalData
export interface ChemicalData {
  // Existing fields...
  
  // New field for carrier volumes in mixing context
  carrierVolume?: CarrierVolume;
}
```

### Phase 2: Redesign ChemicalProductMixingTab

**Rewrite `src/components/farm/chemical/ChemicalProductMixingTab.tsx`:**

New layout structure:

```text
1. Pre-Mix Checklist (Card)
   - Jar test warning (if applicable)
   - DO NOT MIX list (incompatible products)
   - CAUTION list (antagonists/cautionWith)
   
2. Tank Mix Sequence (Card)
   - Full 8-step mixing order table
   - This product highlighted in sequence
   - "Fill tank 3/4 with water" instruction
   
3. Adjuvants (Card)
   - Table: Type, Required/Optional, Rate, Notes
   - Context note (e.g., "Not needed for preemergence")
   
4. Water Quality (Card)
   - pH/hardness requirements with remediation tips
   
5. Carrier Volume (Card)
   - Aerial/Ground/Chemigation minimums
   
6. Crop-Specific Mixing Warnings (Card)
   - Per-crop warning callouts with icons
```

### Phase 3: Create Pre-Mix Checklist Component

**Create `src/components/farm/chemical/PreMixChecklist.tsx`:**

A focused component that shows:
- Red "DO NOT MIX" section for hard stops
- Amber "CAUTION" section for injury risks
- Jar test recommendation badge

Prioritized display order:
1. Jar test warning (always first if true)
2. Incompatible products (DO NOT MIX)
3. Antagonists + cautionWith (CAUTION)

### Phase 4: Create Tank Mix Sequence Component

**Create `src/components/farm/chemical/TankMixSequence.tsx`:**

Shows the standard mixing order with:
- All 8 steps from `MIXING_ORDER_GUIDE`
- The current product row highlighted
- Arrow indicator showing "THIS PRODUCT"

Visual design:
```text
| Step | Category                              |
|------|---------------------------------------|
|  1   | Water conditioners (AMS)              |
|  2   | Inductor products                     |
|  3   | Products in PVA bags                  |
|  4   | Water-dispersible products (DF, WDG)  |
|  5   | Water-soluble products (SL)           |
| ▶ 6  | OUTLOOK (EC) ◀ THIS PRODUCT          |
|  7   | Surfactants, oils                     |
|  8   | Drift retardants                      |
```

### Phase 5: Create Crop Mixing Warnings Component

**Create `src/components/farm/chemical/CropMixingWarnings.tsx`:**

Displays crop-specific tank mix restrictions:
- Emoji icons per crop type
- Severity-based styling (caution=amber, avoid=orange, prohibited=red)
- Grouped by crop for easy scanning

### Phase 6: Update Extraction Prompt for Mixing Data

**Modify `supabase/functions/extract-label/index.ts`:**

Add extraction guidance for:
- `cautionWith` array (injury risk warnings)
- `cropMixingWarnings` (per-crop tank mix restrictions)
- `carrierVolume` (aerial/ground/chemigation)

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/farm/chemical/PreMixChecklist.tsx` | Jar test + DO NOT MIX + CAUTION display |
| `src/components/farm/chemical/TankMixSequence.tsx` | Full 8-step mixing order table |
| `src/components/farm/chemical/CropMixingWarnings.tsx` | Per-crop tank mix warnings |

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/chemicalData.ts` | Add CropMixingWarning, CarrierVolume, extend Compatibility |
| `src/components/farm/chemical/ChemicalProductMixingTab.tsx` | Complete redesign with new components |
| `src/components/farm/chemical/index.ts` | Export new components |
| `supabase/functions/extract-label/index.ts` | Add extraction for new mixing fields |

### Component Hierarchy

```text
ChemicalProductMixingTab
├── PreMixChecklist
│   └── (jar test, incompatible, caution)
├── TankMixSequence
│   └── (8-step table with highlight)
├── AdjuvantRequirementsTable (existing)
│   └── (reused from Rates tab)
├── WaterQualityCard (inline)
│   └── (pH, hardness with notes)
├── CarrierVolumeCard (inline)
│   └── (aerial/ground/chemigation)
└── CropMixingWarnings
    └── (per-crop callouts)
```

### Visual Design Patterns

**Pre-Mix Checklist:**
- Red border/background for "DO NOT MIX"
- Amber border/background for "CAUTION"
- Uses XCircle, AlertTriangle icons

**Tank Mix Sequence:**
- Primary background for current product row
- Arrow icon pointing to highlighted row
- Numbered steps 1-8

**Crop Warnings:**
- Crop emoji + name header
- Severity badge (caution/avoid/prohibited)
- Warning text description

---

## Data Flow

1. **AI Extraction** populates:
   - `compatibility.incompatible` (DO NOT MIX)
   - `compatibility.cautionWith` (CAUTION)
   - `compatibility.cropMixingWarnings` (per-crop)
   - `compatibility.jarTest` (boolean)
   - `carrierVolume` (aerial/ground/chemigation)

2. **Mixing Tab** reads from `chemicalData` and renders:
   - PreMixChecklist from `compatibility`
   - TankMixSequence from `mixingOrder`
   - Adjuvants from `adjuvantRequirements`
   - Water Quality from `compatibility.waterQuality`
   - Carrier Volume from `carrierVolume` or `applicationRequirements`
   - Crop Warnings from `compatibility.cropMixingWarnings`

---

## Editing Flow

Each card section will have:
- View mode (display only)
- Edit mode (triggered by pencil icon)
- Save/Cancel buttons

The AdjuvantRequirementsTable component already supports editable mode.

---

## Expected Result

For Outlook Herbicide, the Mixing tab would show:

**Pre-Mix Checklist:**
- Jar Test Recommended badge
- DO NOT MIX: Ammonium nitrate, Potassium nitrate, Sodium nitrate
- CAUTION: EC products in cotton, Postemergence in dry bean

**Tank Mix Sequence:**
- Steps 1-8 with Outlook highlighted at step 6 (EC)

**Adjuvants:**
- NIS: Optional, 1-2 qt/100, "For burndown partners"
- COC: Optional, 1 qt/ac, "Per partner label"
- AMS: Optional, 8-17 lb/100, "Hard water"
- UAN: Optional, 1-2 gal/ac, "28-32% solution"

**Water Quality:**
- pH: Not specified
- Hardness: Not specified, "Use AMS if hard water"

**Carrier Volume:**
- Aerial: 2+ gal/ac
- Ground: 5+ gal/ac
- Chemigation: 0.33-0.67 in

**Crop-Specific Warnings:**
- Corn: Avoid petroleum-based oils after emergence
- Cotton: EC tank mixes may enhance injury
- Dry Bean: POST tank mixes may cause leaf injury
- Hops: Tank mixes not advised

