
# Add Product Sorting Within Pass Coverage Groups

## Overview
Sort products within each pass by **% of acres applied** (primary, descending) and then by **application cost** (secondary, descending). This ensures the most impactful products appear first within each coverage tier.

## Current Behavior
- Coverage groups are already sorted by acreage percentage (100% → 60% → 25%)
- Products within each group appear in the order they were added (no secondary sorting)

## Proposed Change
Sort applications within each coverage group by their **cost per treated acre** (descending), so the most expensive products appear first within each tier.

---

## Technical Implementation

### File: `src/lib/cropCalculations.ts`

**Update `calculateCoverageGroups()` function (~line 280-291):**

Before returning coverage groups, sort the applications array within each group by cost:

```typescript
// Convert to array and sort by acres descending
return Array.from(groupMap.entries())
  .map(([acresPercentage, { apps, treatedCostSum, fieldCostSum, acresTreatedSum }]) => ({
    acresPercentage,
    tierLabel: getTierLabel(acresPercentage),
    // Sort applications by cost (descending) within each group
    applications: apps.sort((a, b) => {
      const costA = calculateApplicationCostPerAcre(a, products.find(p => p.id === a.productId));
      const costB = calculateApplicationCostPerAcre(b, products.find(p => p.id === b.productId));
      return costB - costA; // Descending: highest cost first
    }),
    costPerTreatedAcre: treatedCostSum,
    costPerFieldAcre: fieldCostSum,
    acresTreated: acresTreatedSum,
  }))
  .sort((a, b) => b.acresPercentage - a.acresPercentage);
```

**Update `calculateCoverageGroupsWithPriceBook()` function (~line 488-499):**

Same pattern, but uses price-book-aware cost calculation:

```typescript
return Array.from(groupMap.entries())
  .map(([acresPercentage, { apps, treatedCostSum, fieldCostSum, acresTreatedSum }]) => ({
    acresPercentage,
    tierLabel: getTierLabel(acresPercentage),
    // Sort applications by cost (descending) within each group
    applications: apps.sort((a, b) => {
      const costA = calculateApplicationCostPerAcreWithPriceBook(
        a, products.find(p => p.id === a.productId),
        priceBookContext.productMasters, priceBookContext.priceBook, priceBookContext.seasonYear
      );
      const costB = calculateApplicationCostPerAcreWithPriceBook(
        b, products.find(p => p.id === b.productId),
        priceBookContext.productMasters, priceBookContext.priceBook, priceBookContext.seasonYear
      );
      return costB - costA; // Descending: highest cost first
    }),
    costPerTreatedAcre: treatedCostSum,
    costPerFieldAcre: fieldCostSum,
    acresTreated: acresTreatedSum,
  }))
  .sort((a, b) => b.acresPercentage - a.acresPercentage);
```

---

## Result

Products in passes will display in this order:

```text
PASS 1: STARTER
├─ Core (100% · 132 ac)
│   ├─ SOP $8.50/ac        ← highest cost in Core
│   └─ KCL $4.90/ac        ← lower cost in Core
├─ Selective (60% · 79 ac)
│   └─ Product X $6.00/ac
└─ Trial (25% · 33 ac)
    └─ AquaYield $0.00/ac
```

---

## Summary

| Change | Location |
|--------|----------|
| Sort applications by cost within each coverage group | `calculateCoverageGroups()` |
| Sort applications by cost (price-book-aware) within each coverage group | `calculateCoverageGroupsWithPriceBook()` |
| Primary sort maintained | Groups by acreage % (descending) |
| Secondary sort added | Products by cost (descending) within each group |

This makes the most expensive products at each coverage level immediately visible, enabling faster budget review and decision-making.
