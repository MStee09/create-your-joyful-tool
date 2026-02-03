

# Pass Type Badge Implementation

## Overview

This plan adds visual pass type indicators (Herbicide, Fungicide, Fertility, etc.) to pass cards in the crop planner. The badge will appear prominently in the pass header, helping users instantly identify the application type.

---

## Current State

Pass cards show:
- Pass name (e.g., "POST PLANT/PRE EMERGE")
- Timing badge (e.g., "At Planting")
- Pattern badge (Uniform/Selective/Trial)
- Function chips (Rooting, Fertility, etc.)
- Coverage distribution

**What's missing:** No indication of the application type (herbicide vs fungicide vs fertility pass).

---

## Implementation Plan

### Phase 1: Create Pass Type Utility

**Create `src/lib/passTypeUtils.ts`:**

Define the pass type detection logic and styling:

```typescript
type PassType = 'herbicide' | 'fungicide' | 'insecticide' 
              | 'fertility' | 'biological' | 'mixed' | 'other';

interface PassTypeConfig {
  label: string;
  icon: string;      // Lucide icon name
  bgColor: string;   // Tailwind bg class
  textColor: string; // Tailwind text class
}

const PASS_TYPE_CONFIG: Record<PassType, PassTypeConfig> = {
  herbicide:   { label: 'Herbicide',   icon: 'Leaf',       bg: 'bg-green-500/15',  text: 'text-green-600' },
  fungicide:   { label: 'Fungicide',   icon: 'FlaskRound', bg: 'bg-purple-500/15', text: 'text-purple-600' },
  insecticide: { label: 'Insecticide', icon: 'Bug',        bg: 'bg-orange-500/15', text: 'text-orange-600' },
  fertility:   { label: 'Fertility',   icon: 'Wheat',      bg: 'bg-blue-500/15',   text: 'text-blue-600' },
  biological:  { label: 'Biological',  icon: 'Sprout',     bg: 'bg-teal-500/15',   text: 'text-teal-600' },
  mixed:       { label: 'Mixed',       icon: 'FlaskConical', bg: 'bg-gray-500/15', text: 'text-gray-600' },
  other:       { label: 'Other',       icon: 'Package',    bg: 'bg-gray-500/15',   text: 'text-gray-500' },
};
```

**Detection Logic:**

```typescript
function getPassType(
  applications: Application[],
  productMasters: ProductMaster[]
): PassType {
  const categories = applications.map(app => {
    const product = productMasters.find(p => p.id === app.productId);
    return product?.category;
  }).filter(Boolean);

  // Count occurrences of each category type
  const counts = {
    herbicide: categories.filter(c => c === 'herbicide').length,
    fungicide: categories.filter(c => c === 'fungicide').length,
    insecticide: categories.filter(c => c === 'insecticide').length,
    fertility: categories.filter(c => 
      c === 'fertilizer-liquid' || c === 'fertilizer-dry' || c === 'micronutrient'
    ).length,
    biological: categories.filter(c => c === 'biological').length,
  };

  // If multiple major types, return 'mixed'
  const significantTypes = Object.entries(counts)
    .filter(([_, count]) => count > 0);
  
  if (significantTypes.length > 1) return 'mixed';
  if (significantTypes.length === 1) return significantTypes[0][0] as PassType;
  
  return 'other';
}
```

### Phase 2: Add Pass Type Badge to PassCard

**Modify `src/components/farm/PassCard.tsx`:**

1. Import the new utility and Lucide icons
2. Calculate pass type in the component
3. Render badge in the header

**Badge Placement:**

The badge will appear after the timing display, before the pattern badge:

```text
POST PLANT/PRE EMERGE
At Planting  [Herbicide]  Uniform  ⏱ 1 ...
```

**Visual Design:**

```tsx
{passType !== 'other' && (
  <span className={cn(
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
    passTypeConfig.bg,
    passTypeConfig.text
  )}>
    <PassTypeIcon className="w-3 h-3" />
    {passTypeConfig.label}
  </span>
)}
```

### Phase 3: Icon Selection

Using Lucide icons that match the semantic meaning:

| Pass Type | Icon | Rationale |
|-----------|------|-----------|
| Herbicide | `Leaf` or `Sprout` | Vegetation control |
| Fungicide | `FlaskRound` | Lab/treatment |
| Insecticide | `Bug` | Insect control |
| Fertility | `Wheat` | Plant nutrition |
| Biological | `Dna` or `Microscope` | Living organisms |
| Mixed | `FlaskConical` | Multiple types |

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/passTypeUtils.ts` | Pass type detection and styling config |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/farm/PassCard.tsx` | Add pass type badge to header |

### Component Updates

In `PassCard.tsx`:

1. Add new imports:
   ```tsx
   import { getPassType, PASS_TYPE_CONFIG } from '@/lib/passTypeUtils';
   import { Leaf, FlaskRound, Bug, Wheat, Sprout, FlaskConical, Package } from 'lucide-react';
   ```

2. Calculate pass type in `useMemo`:
   ```tsx
   const passType = useMemo(() => 
     getPassType(summary.applications, productMasters),
     [summary.applications, productMasters]
   );
   ```

3. Add badge after timing line:
   ```tsx
   {passType !== 'other' && (
     <PassTypeBadge type={passType} />
   )}
   ```

---

## Visual Examples

**Herbicide Pass:**
```text
POST PLANT/PRE EMERGE                    Uniform    ⏱ 1    $9.66/ac
At Planting  🌿 Herbicide
Core  1 product · 158 ac  0.1 gal
```

**Mixed Pass (herbicide + fertility):**
```text
BURNDOWN                                 Selective   ⏱ 2    $24.50/ac
Pre-Plant  ⚗️ Mixed
Building 2 · Trial 1 · 158 ac
```

**Fertility Pass:**
```text
STARTER                                  Uniform    ⏱ 1    $18.00/ac
At Planting  🌾 Fertility
Core  2 products · 158 ac  8.5 gal
```

---

## Edge Cases

1. **Empty pass:** No products = no badge shown
2. **Adjuvant-only pass:** Classified as "other" (no badge)
3. **Seed treatment:** Will show if detected, but typically separate
4. **Unknown categories:** Fall back to "other"

---

## Expected Result

Users will be able to:
- Instantly identify what type of application each pass represents
- Scan the season timeline and distinguish herbicide passes from fertility passes
- See "Mixed" badge when a pass combines multiple product types

