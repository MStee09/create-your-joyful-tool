
# Fix "% Ready" to Include Partial On-Hand Coverage

## Problem

The Order Status progress bar shows "X% ready" but this percentage is calculated based on **count of fully-covered products**, not actual inventory coverage.

**Example of the issue:**
- 10 products in plan
- 8 products have 80% of needed inventory on-hand (but need orders to complete)
- 2 products are fully covered on-hand

**Current display:** "20% ready" (only 2/10 are fully covered)  
**Better display:** "66% ready" (based on actual on-hand value coverage)

## Solution

Change the "% ready" progress bar display to show **value-based on-hand coverage** instead of product count. This gives a more accurate picture of how prepared you are.

### Current vs Proposed

| Metric | Current Calculation | Proposed Calculation |
|--------|---------------------|----------------------|
| % Ready | `readyCount / totalCount` | `onHandValue / plannedValue` |
| Progress bar green segment | Products fully covered by on-hand | Proportion of planned $ value on-hand |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/farm/PlanReadinessView.tsx` | Update progress bar to use `onHandValue / plannedValue` for the "ready" percentage |

## Implementation Details

### Update Progress Bar Logic (lines 263-267)

**Before:**
```typescript
const total = readiness.totalCount || 1;
const readyPct = (readiness.readyCount / total) * 100;
const onOrderPct = (readiness.onOrderCount / total) * 100;
const blockingPct = (readiness.blockingCount / total) * 100;
```

**After:**
```typescript
// Value-based progress percentages
const onHandPct = valueMetrics.plannedValue > 0 
  ? (valueMetrics.onHandValue / valueMetrics.plannedValue) * 100 
  : 0;
const onOrderPct = valueMetrics.plannedValue > 0 
  ? (valueMetrics.onOrderValue / valueMetrics.plannedValue) * 100 
  : 0;
// Ensure percentages don't exceed 100% total
const cappedOnHandPct = Math.min(100, onHandPct);
const cappedOnOrderPct = Math.min(100 - cappedOnHandPct, onOrderPct);
const blockingPct = Math.max(0, 100 - cappedOnHandPct - cappedOnOrderPct);
```

### Update Progress Bar Display (line 388)

**Before:**
```tsx
<span>{Math.round(readyPct)}% ready</span>
```

**After:**
```tsx
<span>{Math.round(cappedOnHandPct)}% on hand</span>
```

### Update Progress Bar Segments (lines 390-394)

**Before:**
```tsx
<div className="bg-emerald-500 transition-all" style={{ width: `${readyPct}%` }} />
<div className="bg-amber-500 transition-all" style={{ width: `${onOrderPct}%` }} />
<div className="bg-rose-500 transition-all" style={{ width: `${blockingPct}%` }} />
```

**After:**
```tsx
<div className="bg-emerald-500 transition-all" style={{ width: `${cappedOnHandPct}%` }} />
<div className="bg-amber-500 transition-all" style={{ width: `${cappedOnOrderPct}%` }} />
<div className="bg-rose-500 transition-all" style={{ width: `${blockingPct}%` }} />
```

### Update Legend Text (lines 396-407)

Update labels to reflect value-based coverage:
- "On Hand (X%)" instead of "Ready (count)"
- "Ordered (X%)" instead of "Ordered (count)"
- "To Go (X%)" instead of "Need to Order (count)"

## Expected Results

### Before Fix
- Progress bar: 20% green (only fully-covered products)
- Display: "20% ready"

### After Fix
- Progress bar: Proportional to actual $ coverage
- Display: "66% on hand" (if $20k of $30k planned value is on-hand)

This gives you an instant visual of how much of your **budget** is covered, not just product counts.
