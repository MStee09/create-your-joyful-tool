
# Add Per-Product Applied Nutrient Analysis to PDF Export

## Overview
Add per-product NPKS nutrient contribution badges to each product row in the PDF export view, matching the interactive crop planning view. This will show the applied nutrients (based on product analysis × rate) for each product line item.

## Current State
- **Interactive View** (`ProductRowReadable.tsx`): Shows nutrient badges like "N 20.7" for each product based on `calculateApplicationNutrients()`
- **PDF Export View** (`CropPlanPrintView.tsx`): Only shows the fertilizer grade (e.g., "20-0-0") but NOT the applied nutrient contribution per product

## What Will Change

Each product row in the PDF export will gain a new "Applied" column showing the calculated NPKS contribution in lbs/acre:

```text
Before:
| Product              | Rate       | Acres % | $/Acre | Role  |
| CheckMate N 20-0-0   | 11.00 gal  | 100%    | $21.23 | Macro |

After:
| Product              | Rate       | Acres % | $/Acre | Applied (lbs/ac) | Role  |
| CheckMate N 20-0-0   | 11.00 gal  | 100%    | $21.23 | N 20.7           | Macro |
```

Only non-zero nutrients (>0.1 lbs/ac) will be displayed to reduce clutter.

---

## Technical Implementation

### File: `src/components/farm/CropPlanPrintView.tsx`

**1. Import the calculation function:**
```typescript
import { calculateApplicationNutrients } from '@/lib/calculations';
```

**2. Add a helper to format applied nutrients:**
```typescript
const formatAppliedNutrients = (nutrients: { n: number; p: number; k: number; s: number }): string => {
  const parts: string[] = [];
  if (nutrients.n > 0.1) parts.push(`N ${nutrients.n.toFixed(1)}`);
  if (nutrients.p > 0.1) parts.push(`P ${nutrients.p.toFixed(1)}`);
  if (nutrients.k > 0.1) parts.push(`K ${nutrients.k.toFixed(1)}`);
  if (nutrients.s > 0.1) parts.push(`S ${nutrients.s.toFixed(1)}`);
  return parts.join(' · ') || '—';
};
```

**3. Add new table column header:**
```tsx
<th className="px-4 py-2 text-right">Applied (lbs/ac)</th>
```

**4. Calculate and display applied nutrients per product:**
```tsx
// Inside the product row mapping:
const appNutrients = calculateApplicationNutrients(
  app.rate,
  app.rateUnit,
  analysisData,
  product?.form || 'liquid',
  product?.densityLbsPerGal
);

// New table cell:
<td className="px-4 py-2 text-right text-xs">
  {formatAppliedNutrients(appNutrients)}
</td>
```

---

## Summary

| Change | Description |
|--------|-------------|
| New column | "Applied (lbs/ac)" added to the products table in PDF |
| Calculation | Uses existing `calculateApplicationNutrients()` function |
| Display format | Compact inline format: "N 20.7 · S 4.0" |
| Threshold | Only shows nutrients > 0.1 lbs/ac to reduce noise |

This ensures PDF exports match the interactive view, giving users a complete operational record with per-product nutrient contributions.
