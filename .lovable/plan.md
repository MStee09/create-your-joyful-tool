

# Add Per-Tier Nutrient Totals to Coverage Groups

## Overview
Add nutrient analysis (N-P-K-S) to each coverage group header (Core, Selective, Trial) so users can see exactly what those treated acres receive, rather than having to sum individual product rows.

---

## Visual Result

### Expanded Pass View (Trial Tier Example)
```text
Before:
  Trial                 25% · 40 ac                    $6.50/ac treated
                                                       $1.63/ac field

After:
  Trial                 25% · 40 ac                    $6.50/ac treated
  N 18.9 | K 10.0 | S 25.2                             $1.63/ac field
```

Each tier header shows the **raw nutrient sum** for products in that tier - this is exactly what those 40 acres receive.

---

## Technical Implementation

### 1. Update `CoverageGroup` Interface
**File**: `src/lib/cropCalculations.ts` (lines 22-29)

Add a `nutrients` field to store the aggregated nutrient totals for the group:

```typescript
export interface CoverageGroup {
  acresPercentage: number;
  tierLabel: 'Core' | 'Selective' | 'Trial';
  applications: Application[];
  costPerTreatedAcre: number;
  costPerFieldAcre: number;
  acresTreated: number;
  nutrients: { n: number; p: number; k: number; s: number }; // NEW
}
```

### 2. Update `calculateCoverageGroups()` Function
**File**: `src/lib/cropCalculations.ts` (~lines 244-297)

Track nutrient sums while building coverage groups:

```typescript
const groupMap = new Map<
  number,
  {
    apps: Application[];
    treatedCostSum: number;
    fieldCostSum: number;
    acresTreatedSum: number;
    nutrients: { n: number; p: number; k: number; s: number }; // NEW
  }
>();

applications.forEach(app => {
  const product = products.find(p => p.id === app.productId);
  // ...existing code...
  
  if (!groupMap.has(bucket)) {
    groupMap.set(bucket, { 
      apps: [], treatedCostSum: 0, fieldCostSum: 0, acresTreatedSum: 0,
      nutrients: { n: 0, p: 0, k: 0, s: 0 } // NEW
    });
  }
  const group = groupMap.get(bucket)!;
  group.apps.push(app);
  
  // Existing economics
  group.treatedCostSum += costPerAcre;
  group.fieldCostSum += costPerAcre * (actualAcresPercentage / 100);
  group.acresTreatedSum += crop.totalAcres * (actualAcresPercentage / 100);
  
  // NEW: Accumulate raw nutrients (unweighted - what treated acres receive)
  const appNutrients = calculateApplicationNutrients(app, product);
  group.nutrients.n += appNutrients.n;
  group.nutrients.p += appNutrients.p;
  group.nutrients.k += appNutrients.k;
  group.nutrients.s += appNutrients.s;
});

// In the return, include nutrients in each group
return Array.from(groupMap.entries())
  .map(([acresPercentage, { apps, treatedCostSum, fieldCostSum, acresTreatedSum, nutrients }]) => ({
    acresPercentage,
    tierLabel: getTierLabel(acresPercentage),
    applications: apps.slice().sort(/* existing sort logic */),
    costPerTreatedAcre: treatedCostSum,
    costPerFieldAcre: fieldCostSum,
    acresTreated: acresTreatedSum,
    nutrients, // NEW
  }))
  .sort((a, b) => b.acresPercentage - a.acresPercentage);
```

### 3. Update `calculateCoverageGroupsWithPriceBook()` Function
**File**: `src/lib/cropCalculations.ts` (~lines 452-520)

Same pattern applied to the price-book-aware function.

### 4. Update PassCard Tier Header Display
**File**: `src/components/farm/PassCard.tsx` (~lines 393-419)

Add nutrient display in the coverage group header:

```tsx
{summary.coverageGroups.length > 1 && (
  <div className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg">
    <div className="flex items-center gap-2">
      <span className={cn(/* tier badge styles */)}>
        {group.tierLabel}
      </span>
      <span className="text-sm text-muted-foreground">
        {formatNumber(group.acresPercentage, 0)}% · {formatNumber(group.acresTreated, 0)} ac
      </span>
      {/* NEW: Tier-level nutrient analysis */}
      {(group.nutrients.n > 0.1 || group.nutrients.k > 0.1 || group.nutrients.s > 0.1) && (
        <span className="text-xs text-muted-foreground ml-2">
          {group.nutrients.n > 0.1 && <span className="text-emerald-600">N {formatNumber(group.nutrients.n, 1)}</span>}
          {group.nutrients.k > 0.1 && <span className="text-amber-600 ml-1">K {formatNumber(group.nutrients.k, 1)}</span>}
          {group.nutrients.s > 0.1 && <span className="text-purple-600 ml-1">S {formatNumber(group.nutrients.s, 1)}</span>}
        </span>
      )}
    </div>
    <div className="text-right">
      {/* existing cost display */}
    </div>
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/cropCalculations.ts` | Add `nutrients` to `CoverageGroup` interface; accumulate unweighted nutrient sums in `calculateCoverageGroups()` and `calculateCoverageGroupsWithPriceBook()` |
| `src/components/farm/PassCard.tsx` | Display tier-level nutrients in the coverage group header |

---

## Summary

- **Pass Header**: Continues to show **field-weighted** nutrients (what this pass contributes to the whole crop budget)
- **Tier Headers** (Core/Selective/Trial): Now show **raw nutrient totals** (what those treated acres actually receive)
- Color-coded display (N=emerald, K=amber, S=purple) for quick scanning
- Only shows nutrients above 0.1 lbs/ac to reduce clutter

This gives you both perspectives: the budget-level contribution at the pass header, and the agronomic intensity at the tier level.

