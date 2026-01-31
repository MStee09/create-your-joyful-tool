

# Add Total Physical Quantity to Pass Headers

## Overview
Add a display of total physical product volume/weight at the pass level, showing how much actual product is being applied in each pass (e.g., "115 lbs dry + 3.5 gal liquid").

---

## Current State
Looking at your screenshot, the pass header shows:
- **N 45.7 | P 0.0 | K 25.0 | S 27.0** (nutrient lbs/ac)
- **$53.90/ac** and **$7,007.00 total**

Individual products show their rate (e.g., "50.0 lbs", "65.0 lbs") but the pass header doesn't aggregate these into a total.

---

## Proposed Display

Add a line to the pass header showing:

```
• 115 lbs dry · 0 gal liquid
```

Or simplified when only one form is present:
```
• 115 lbs dry
```

For the pass in your screenshot (SOP 50 lbs + Urea 65 lbs + AMS ~65 lbs assumed):
```
• ~180 lbs dry
```

---

## Implementation

### 1. Add Physical Quantities to PassSummary Interface

**File: `src/lib/cropCalculations.ts`**

Add new fields to track total physical product:

```typescript
export interface PassSummary {
  // ... existing fields
  physicalQuantity: {
    totalDryLbs: number;    // Total lbs of dry product per acre
    totalLiquidGal: number; // Total gallons of liquid product per acre
  };
}
```

### 2. Calculate Quantities in Pass Summary Functions

**File: `src/lib/cropCalculations.ts`**

In `calculatePassSummary()` and `calculatePassSummaryWithPriceBook()`:

```typescript
// Track physical quantities (per acre rates)
const physicalQuantity = { totalDryLbs: 0, totalLiquidGal: 0 };

applications.forEach(app => {
  const product = products.find(p => p.id === app.productId);
  if (!product) return;
  
  if (product.form === 'liquid') {
    // Convert rate to gallons
    physicalQuantity.totalLiquidGal += convertToGallons(app.rate, app.rateUnit as LiquidUnit);
  } else {
    // Convert rate to pounds
    physicalQuantity.totalDryLbs += convertToPounds(app.rate, app.rateUnit as DryUnit);
  }
});

// Include in return
return {
  // ...existing fields
  physicalQuantity,
};
```

### 3. Display in PassCard Header

**File: `src/components/farm/PassCard.tsx`**

Add after the nutrient summary line:

```tsx
{/* Physical quantity summary */}
{(summary.physicalQuantity.totalDryLbs > 0 || summary.physicalQuantity.totalLiquidGal > 0) && (
  <span className="text-sm text-muted-foreground">
    • {summary.physicalQuantity.totalDryLbs > 0 && (
      <>{formatNumber(summary.physicalQuantity.totalDryLbs, 0)} lbs</>
    )}
    {summary.physicalQuantity.totalDryLbs > 0 && summary.physicalQuantity.totalLiquidGal > 0 && (
      <> · </>
    )}
    {summary.physicalQuantity.totalLiquidGal > 0 && (
      <>{formatNumber(summary.physicalQuantity.totalLiquidGal, 1)} gal</>
    )}
  </span>
)}
```

---

## Visual Result

**Before:**
```
PREPLANT DRY BROADCAST
  Core 3 products  • N 45.7 | P 0.0 | K 25.0 | S 27.0
                   Ratios N:S 1.7:1 · N:K 1.8:1
```

**After:**
```
PREPLANT DRY BROADCAST
  Core 3 products  • N 45.7 | P 0.0 | K 25.0 | S 27.0
                   Ratios N:S 1.7:1 · N:K 1.8:1 · 180 lbs
```

Or displayed on its own line for clarity:
```
PREPLANT DRY BROADCAST
  Core 3 products  • N 45.7 | P 0.0 | K 25.0 | S 27.0
                   Ratios N:S 1.7:1 · N:K 1.8:1
                   180 lbs dry product/ac
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/cropCalculations.ts` | Add `physicalQuantity` to `PassSummary` interface, calculate in both `calculatePassSummary()` and `calculatePassSummaryWithPriceBook()` |
| `src/components/farm/PassCard.tsx` | Display the physical quantity in the pass header |

---

## Edge Cases

| Scenario | Display |
|----------|---------|
| Only dry products | "180 lbs" |
| Only liquid products | "5.2 gal" |
| Mixed dry + liquid | "115 lbs · 2.5 gal" |
| No products | (hidden) |

---

## Technical Notes

- Quantities are **per-acre rates** (matching how individual product rates are displayed)
- Uses existing `convertToGallons()` and `convertToPounds()` functions
- Handles all rate units (oz, lbs, g, ton, qt, gal)
- Does NOT account for acres percentage (shows raw per-acre amount) - this matches how individual product rates are displayed

