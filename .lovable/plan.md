

# Phase 4: Crop Plan Enhancements (Updated)
## Field Assignments, Field-Specific Overrides, and Weighted Averages

---

## Overview

Phase 4 transforms the crop planning system from a single "plan per crop" model to a **field-aware mixed inheritance model**:

1. **Crop Plan = Master Template** - The existing crop plan becomes a template that fields inherit
2. **Field Assignments** - Connect fields to crops for a season with optional rate overrides
3. **Weighted Averages** - Crop-level summaries show weighted averages across assigned fields
4. **By Field View** - New tab showing per-field costs, nutrients, and applied products

This enables precision prescriptions where fields can have:
- Template inheritance (same as crop plan)
- Field-specific rate adjustments (e.g., +10% N on sandy field)
- Field exclusions (product not applied on this field)
- Field-only additions (product only on specific field)

---

## Feedback Incorporated

| Feedback Item | Resolution |
|---------------|------------|
| Override type naming | Using shorter names: `rate_adjust`, `exclude`, `add`, plus new `absolute` type |
| Rate adjustment UX | Support both percentage (+10%) and absolute rate (4 oz) entry in UI |
| Mix Calculator link | Add quick-action button on By Field View to open Mix Calculator for that field |
| Show assignment conflicts | Field Assignment Modal shows warning when field already assigned to another crop |
| PassCard field-specific badge | Add ⚡ "Field Specific" indicator when any field has overrides for that pass |

---

## Database Changes

### 1. Create `field_crop_overrides` Table

Stores field-specific modifications to the crop plan template:

```text
┌─────────────────────────────────────────────────────────────┐
│ field_crop_overrides                                        │
├─────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                            │
│ user_id         UUID NOT NULL → auth.users(id)              │
│ field_assignment_id  UUID NOT NULL → field_assignments(id)  │
│ application_id  TEXT NOT NULL                               │
│ override_type   TEXT  -- 'rate_adjust' | 'absolute' |       │
│                        'exclude' | 'add'                    │
│ rate_adjustment NUMERIC  -- multiplier (e.g., 1.1 = +10%)   │
│ custom_rate     NUMERIC  -- absolute rate value             │
│ custom_unit     TEXT     -- unit for absolute/add types     │
│ notes           TEXT                                        │
│ created_at      TIMESTAMPTZ                                 │
└─────────────────────────────────────────────────────────────┘
```

### 2. Update `field_assignments` with Planning Fields

Add to existing table:
- `planned_acres` - Acres to apply (may differ from field total)
- `notes` - Assignment-level notes

---

## Override Types Explained

| Type | User Entry | Stored As | Example |
|------|------------|-----------|---------|
| `rate_adjust` | "+10%" or "-20%" | `rate_adjustment: 1.1` or `0.8` | Template 2 lbs → 2.2 lbs |
| `absolute` | "4 oz" (specific rate) | `custom_rate: 4, custom_unit: 'oz'` | Override to exact rate |
| `exclude` | [Exclude ✕] | `override_type: 'exclude'` | Product not applied on field |
| `add` | [+ Add Product] | `custom_rate`, `custom_unit` | Field-only addition |

---

## Data Flow Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         Crop Plan (Template)                          │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Pass 1: Burndown                                     [⚡]      │ │
│  │    • Glyphosate @ 32 oz/ac                                      │ │
│  │    • AMS @ 2 lbs/ac                                             │ │
│  ├─────────────────────────────────────────────────────────────────┤ │
│  │  Pass 2: Pre-Emerge                                   [⚡]      │ │
│  │    • Dual Magnum @ 1.5 pt/ac                                    │ │
│  │    • Atrazine @ 1 qt/ac                                         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ Inheritance
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  North 80       │      │  River Bottom   │      │  Sandy 40       │
│  80 acres       │      │  120 acres      │      │  40 acres       │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│  [Inherits all] │      │  [Inherits all] │      │  Override:      │
│                 │      │  + Add: Sulfur  │      │  Atrazine EXCL  │
│                 │      │    @ 5 lbs/ac   │      │  AMS → 2.5 lb   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
   Field Cost/Ac           Field Cost/Ac           Field Cost/Ac
   $125.40                 $132.80                 $118.60
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Crop Weighted Avg     │
                    │   $126.40/ac            │
                    │   (acres-weighted)      │
                    └─────────────────────────┘
```

**Note:** The ⚡ badge on passes indicates "rates vary by field" - visible at a glance in PassCard headers.

---

## Type Definitions

### New Types in `src/types/field.ts`

```typescript
export type OverrideType = 'rate_adjust' | 'absolute' | 'exclude' | 'add';

export interface FieldCropOverride {
  id: string;
  fieldAssignmentId: string;
  applicationId: string;  // References Application.id in crop plan
  overrideType: OverrideType;
  rateAdjustment?: number;  // Multiplier: 1.1 = +10%, 0.8 = -20%
  customRate?: number;      // For 'absolute' or 'add' types
  customUnit?: string;      // Unit for custom rate
  notes?: string;
  createdAt: string;
}

export interface FieldAssignmentExtended extends FieldAssignment {
  fieldName: string;
  farm?: string;
  overrides: FieldCropOverride[];
  // Calculated
  effectiveApplications?: EffectiveApplication[];
  costPerAcre?: number;
  nutrients?: { n: number; p: number; k: number; s: number };
}

export interface EffectiveApplication {
  applicationId: string;
  productId: string;
  productName: string;
  baseRate: number;
  effectiveRate: number;  // After override
  unit: string;
  isExcluded: boolean;
  isFieldOnly: boolean;   // Only on this field, not in template
  overrideNote?: string;
}
```

---

## UI Components

### 1. PassCard Enhancement: Field-Specific Badge

Add ⚡ badge to PassCard header when any assigned field has overrides for products in that pass:

```text
┌──────────────────────────────────────────────────────────────────────┐
│  ▶ PRE-EMERGE  [Uniform]  [Fertility] [Rooting]  [⚡ 2 fields vary]   │
│    Core 4 products · 240 ac · N 45 | P 0 | K 0 | S 12                │
└──────────────────────────────────────────────────────────────────────┘
```

**Implementation:** Check if any `FieldCropOverride` exists for applications in this timing. Badge shows count of fields with overrides.

### 2. Crop Planning View Updates

**Header Enhancement:**
- Add field count badge: "Corn • 3 fields • 240 ac"
- Add "Assign Fields" button opening field assignment modal

**Summary Cards Update:**
- Show "Effective $/ac" as weighted average
- Add tooltip: "Weighted average across 3 fields"

### 3. Field Assignment Modal with Conflict Detection

Modal for assigning fields to a crop with conflict warnings:

```text
┌──────────────────────────────────────────────────────────────┐
│  Assign Fields to: Corn                              [Close] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ☑ North 80          Home Farm    80 ac               │   │
│  │ ☑ River Bottom      Home Farm    120 ac              │   │
│  │ ☐ Section 22 W      Wheeler      160 ac              │   │
│  │     ⚠️ Currently assigned to Soybeans                │   │
│  │ ☑ Sandy 40          Home Farm    40 ac               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Selected: 3 fields · 240 acres                              │
│                                                              │
│  [Cancel]                                      [Save Fields] │
└──────────────────────────────────────────────────────────────┘
```

**Conflict behavior:** User can still check the field to reassign it, but warning makes them aware.

### 4. By Field View Tab with Mix Calculator Link

Tab within crop planning showing per-field breakdown with actions:

```text
┌──────────────────────────────────────────────────────────────────────┐
│  [Passes]  [By Field]  [Summary]                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  CROP AVERAGE (240 ac)                                        │   │
│  │  $/ac: $126.40 · N: 145 · P: 40 · K: 60 · S: 24               │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Field          Farm        Acres   $/ac    Var%    Actions          │
│  ────────────────────────────────────────────────────────────────── │
│  North 80       Home Farm   80      $125.40  -0.8%  [🧪 Mix] [✎]     │
│  River Bottom   Home Farm   120     $132.80  +5.1%  [🧪 Mix] [✎]     │
│    └─ +Sulfur @ 5 lbs/ac                                              │
│  Sandy 40       Home Farm   40      $118.60  -6.2%  [🧪 Mix] [✎]     │
│    └─ No Atrazine, AMS → 2.5 lbs/ac                                   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Mix Calculator Link:** Clicking [🧪 Mix] opens Mix Calculator pre-populated with:
- Field acres
- Products from this field's effective applications
- Default equipment selection

### 5. Field Override Editor with Percentage + Absolute Input

Inline expansion when clicking a field row with intuitive rate entry:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Sandy 40 - Overrides                                    [Collapse] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Burndown Pass:                                                      │
│    Glyphosate   32 oz/ac   [Inherit ▼]                               │
│    AMS          2 lbs/ac   [Adjust ▼]  [+25 %] → 2.5 lbs/ac         │
│                            [Set to ▼]  [2.5 lbs/ac]                  │
│                                                                      │
│  Pre-Emerge Pass:                                                    │
│    Dual Magnum  1.5 pt/ac  [Inherit ▼]                               │
│    Atrazine     1 qt/ac    [Exclude ✕]                               │
│                                                                      │
│  [+ Add Field-Only Product]                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Override dropdown options:**
- **Inherit** - Use template rate (default)
- **Adjust %** - Enter percentage like "+10" or "-20", stored as multiplier
- **Set to** - Enter absolute rate like "4 oz", stored as custom_rate
- **Exclude** - Don't apply this product on this field

---

## Calculation Engine Updates

### 1. New: `src/lib/fieldPlanCalculations.ts`

```typescript
/**
 * Calculate effective applications for a field assignment
 * Merges crop template with field overrides
 */
export function calculateFieldEffectiveApplications(
  cropApplications: Application[],
  overrides: FieldCropOverride[],
  products: ProductMaster[]
): EffectiveApplication[];

/**
 * Calculate cost per acre for a specific field
 */
export function calculateFieldCostPerAcre(
  effectiveApplications: EffectiveApplication[],
  products: ProductMaster[],
  priceBook: PriceBookEntry[]
): number;

/**
 * Calculate weighted average for crop across all assigned fields
 */
export function calculateCropWeightedAverages(
  fieldAssignments: FieldAssignmentExtended[],
  metric: 'cost' | 'n' | 'p' | 'k' | 's'
): number;

/**
 * Check if a pass has any field-specific overrides
 * Used for PassCard ⚡ badge
 */
export function passHasFieldOverrides(
  timingId: string,
  cropApplications: Application[],
  allOverrides: FieldCropOverride[]
): { hasOverrides: boolean; fieldCount: number };
```

### 2. Update Dashboard & Export

- Dashboard summary cards use weighted averages when fields are assigned
- PDF export includes "By Field" section
- Demand rollup aggregates across all assigned field acres

---

## Implementation Sequence

### Step 1: Database Migration
- Create `field_crop_overrides` table with RLS
- Add planning columns to `field_assignments`

### Step 2: Type Definitions
- Add `FieldCropOverride`, `FieldAssignmentExtended`, `EffectiveApplication` to types
- Add `OverrideType` enum including `absolute`

### Step 3: Data Layer
- Extend `useSupabaseData.ts` with override CRUD
- Add loading of overrides joined with assignments

### Step 4: Calculation Engine
- Create `fieldPlanCalculations.ts`
- Add `passHasFieldOverrides` function for badge logic
- Update `calculateSeasonSummaryWithPriceBook` to use weighted averages

### Step 5: UI - Field Assignment Modal
- Create `FieldAssignmentModal.tsx`
- Add conflict detection for fields already assigned to other crops
- Add "Assign Fields" button to crop planning header

### Step 6: UI - PassCard Field-Specific Badge
- Add ⚡ badge to PassCard when `passHasFieldOverrides` returns true
- Show count of fields with overrides in tooltip

### Step 7: UI - By Field View Tab
- Create `CropByFieldView.tsx` tab component
- Add Mix Calculator quick-action button per field
- Add field row expansion with override editor

### Step 8: UI - Override Editor
- Create `FieldOverrideEditor.tsx` inline component
- Support percentage adjustment ("+10%") and absolute rate ("4 oz") inputs
- Rate adjustment, exclude, and add product controls

### Step 9: Integration
- Update demand rollup to use field acres
- Update PDF export with field breakdown
- Wire Mix Calculator pre-population from field context

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/fieldPlanCalculations.ts` | Effective rate, weighted average, and pass override detection |
| Create | `src/components/farm/FieldAssignmentModal.tsx` | Assign fields to crop with conflict detection |
| Create | `src/components/farm/CropByFieldView.tsx` | By Field tab with Mix Calculator links |
| Create | `src/components/farm/FieldOverrideEditor.tsx` | Per-field override controls with % and absolute input |
| Modify | `src/types/field.ts` | Add override and extended types |
| Modify | `src/hooks/useSupabaseData.ts` | Override CRUD operations |
| Modify | `src/components/farm/CropPlanningView.tsx` | Add Assign Fields button, By Field tab |
| Modify | `src/components/farm/PassCard.tsx` | Add ⚡ field-specific badge |
| Modify | `src/lib/calculations.ts` | Update summary to use weighted averages |

---

## Technical Notes

### Override Resolution Priority
1. Field exclusion → product not applied
2. Field absolute rate → use custom_rate directly
3. Field rate adjustment → base rate × multiplier
4. Field-only addition → included even if not in template
5. Template inheritance → use base rate unchanged

### Weighted Average Formula
```
Weighted $/ac = Σ(field_cost × field_acres) / Σ(field_acres)
```

### Backwards Compatibility
- Crops with no field assignments continue to work
- Use crop.totalAcres as fallback when no fields assigned
- Existing application data unchanged

### Mix Calculator Pre-Population
When clicking [🧪 Mix] from By Field View:
1. Set acres to field's planned_acres (or field.acres)
2. Pre-select products from field's effective applications
3. Use default rates from effective applications
4. Keep equipment selection as user's last choice or prompt

---

## Estimated Effort

| Component | New Lines | Modified Lines |
|-----------|-----------|----------------|
| Database migration | 1 file | - |
| Type definitions | ~60 | ~20 |
| Calculation engine | ~150 | ~50 |
| FieldAssignmentModal | ~200 | - |
| CropByFieldView | ~250 | - |
| FieldOverrideEditor | ~300 | - |
| PassCard badge | - | ~40 |
| Data hooks | - | ~80 |
| Integration | - | ~100 |
| **Total** | **~960** | **~290** |

