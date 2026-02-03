
# Inventory Integration Expansion

## Problem Statement

Inventory data is currently siloed to the Inventory tab and not surfacing actionable insights where users need them most. The Order Status widget on the Dashboard and detailed view only show product counts (e.g., "3 Ready, 2 Ordered"), not the actual coverage percentages or quantities that would help with decision-making.

## Solution Overview

Expand inventory visibility across the application to make it genuinely useful for operational planning:

1. **Dashboard Order Status Widget** - Show % coverage by value or volume
2. **Order Status Detail Page** - Add summary metrics for inventory position
3. **Demand Rollup View** - Add "On Hand" and "To Order" columns
4. **Pass Cards in Crop Planning** - Show inventory indicator for products without stock

---

## Phase 1: Dashboard Order Status Enhancement

**File: `src/components/farm/DashboardView.tsx`**

Update the Order Status widget to show meaningful inventory metrics:

**Current:**
```
[Progress Bar: Ready | Ordered | Need to Order]
3 Ready • 2 Ordered • 1 Need to Order
```

**Proposed:**
```
[Progress Bar: Covered | On Order | Short]

Coverage: 85% by volume
$12,400 On Hand · $3,200 Ordered · $1,800 to Go

3 Ready • 2 Ordered • 1 Need to Order
```

Changes:
- Add a "coverage percentage" calculation based on inventory quantity vs. planned need
- Add dollar values for On Hand, Ordered, and remaining "To Go" positions
- Keep the product count legend for context

**New calculation needed:**
```typescript
// In planReadinessUtils.ts - add volume/value metrics
interface ReadinessSummary {
  // ...existing counts
  onHandValue: number;      // $ value of current inventory
  onOrderValue: number;     // $ value of pending orders
  shortValue: number;       // $ value still needed
  coveragePct: number;      // (onHand + onOrder) / planned * 100
}
```

---

## Phase 2: Order Status Detailed Page Enhancement

**File: `src/components/farm/PlanReadinessView.tsx`**

Add a new summary row showing total quantities and values:

**Current Summary Cards:**
| Total Products | Ready | Ordered | Need to Order |
|----------------|-------|---------|---------------|
| 6 | 3 | 2 | 1 |

**Proposed - Add second row:**

| On Hand Value | Ordered Value | Still Needed |
|---------------|---------------|--------------|
| $12,400 | $3,200 | $1,800 |

| Coverage by Volume | Coverage by Value |
|--------------------|-------------------|
| 78% | 85% |

This gives users actual financial visibility into their inventory position.

---

## Phase 3: Demand Rollup Inventory Integration

**File: `src/components/farm/DemandRollupView.tsx`**

Add "On Hand" and "Net Need" columns to show true purchase requirements:

**Current columns:**
| Commodity | Total Qty | UOM | Crops |

**Proposed columns:**
| Commodity | Planned | On Hand | Net Need | UOM | Crops |

Changes:
- Pass `inventory` prop to DemandRollupView
- Calculate on-hand quantity per commodity (aggregate across linked products)
- Show "Net Need" = max(0, Planned - On Hand)
- Add visual indicator when On Hand covers 100% (green checkmark)

---

## Phase 4: Pass Card Inventory Indicator

**File: `src/components/farm/PassCard.tsx`**

Add a subtle indicator when products in a pass are not covered by inventory:

**Visual change in collapsed header:**
```
POST PLANT/PRE EMERGE  [Herbicide]  Uniform    ⚠️ 2 short    $9.66/ac
```

Changes:
- Pass `inventory` to PassCard (already passed to CropPlanningView)
- Calculate how many products in the pass have insufficient inventory
- Show warning badge: "⚠️ 2 short" if products are uncovered
- Optional: Make it clickable to open Order Status filtered to those products

---

## Technical Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/planReadinessUtils.ts` | Add value/coverage calculations |
| `src/components/farm/DashboardView.tsx` | Enhanced Order Status widget |
| `src/components/farm/PlanReadinessView.tsx` | Add value summary row |
| `src/components/farm/DemandRollupView.tsx` | Add On Hand / Net Need columns |
| `src/components/farm/PassCard.tsx` | Add inventory shortage indicator |
| `src/components/farm/CropPlanningView.tsx` | Pass inventory to PassCard |
| `src/lib/procurementCalculations.ts` | Update DemandRollup to include inventory |
| `src/FarmCalcApp.tsx` | Pass inventory to DemandRollupView |

### New Calculations Needed

**In `planReadinessUtils.ts`:**
```typescript
// Calculate value-based metrics
const onHandValue = readiness.items.reduce((sum, item) => {
  const product = products.find(p => p.id === item.productId);
  const price = product?.price || 0;
  return sum + (item.onHandQty * price);
}, 0);

const plannedValue = readiness.items.reduce((sum, item) => {
  const product = products.find(p => p.id === item.productId);
  const price = product?.price || 0;
  return sum + (item.requiredQty * price);
}, 0);

const coveragePct = plannedValue > 0 
  ? ((onHandValue + onOrderValue) / plannedValue) * 100 
  : 100;
```

---

## Visual Summary

### Dashboard Widget (After)
```
┌─────────────────────────────────────────────────┐
│  Order Status                              ✓    │
├─────────────────────────────────────────────────┤
│  [███████████████░░░░░]                         │
│                                                 │
│  Coverage: 78% by volume                        │
│  $12,400 On Hand · $3,200 Ordered · $1,800 to Go│
│                                                 │
│  3 Ready • 2 Ordered • 1 Need to Order          │
└─────────────────────────────────────────────────┘
```

### Demand Rollup (After)
```
| Commodity      | Planned  | On Hand | Net Need | UOM  |
|----------------|----------|---------|----------|------|
| 28-0-0 (UAN)   | 1,200    | 800     | 400      | gal  |
| 10-34-0 (APP)  | 450      | 450     | ✓ 0      | gal  |
| Glyphosate     | 85       | 0       | 85       | gal  |
```

### Pass Card Shortage Indicator
```
POST PLANT/PRE EMERGE  [Herbicide]  ⚠️ 1 short  $9.66/ac
```

---

## Benefits

1. **Dashboard becomes actionable** - Users see $ value coverage at a glance
2. **Demand Rollup shows true needs** - Net quantity after inventory is clear
3. **Crop planning has inventory context** - Passes show if products are short
4. **Consistent data flow** - All views use the same readiness engine calculations
