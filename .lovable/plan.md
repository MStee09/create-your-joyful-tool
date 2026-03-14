

# Fix: Unit Conversion Across the Entire App

## Root Cause

The purchase line for AMS stores: `quantity=13, packageSize=1, packageUnit='ton'`, so `totalQuantity=13` with `normalizedUnit='ton'`. But planned usage (from `calculatePlannedUsage`) is always in **lbs** for dry products. Every place that compares or adds purchase quantities to planned/inventory quantities uses `totalQuantity` raw — treating 13 tons as 13 lbs.

This same class of bug affects **6 distinct call sites** across the app.

## What Needs to Change

### 1. Create a shared `convertPurchaseLineToBaseUnit()` helper
Location: `src/lib/cropCalculations.ts` (or a new `src/lib/unitConversions.ts`)

Converts a purchase line's `totalQuantity` + `normalizedUnit` to the planned-usage base unit (lbs for dry, gal for liquid). Uses the existing `convertQuantityToUnit` logic.

```text
Input:  totalQuantity=13, normalizedUnit='ton', productForm='dry'
Output: { qty: 26000, unit: 'lbs' }
```

### 2. Fix Readiness Engine inputs (the screenshot bug)
**Files**: `src/components/farm/PlanReadinessView.tsx` (line 109-118) and `src/lib/planReadinessUtils.ts` (line 128-137)

Both `getLineRemainingQty` accessors return raw `totalQuantity` without converting to match `plannedUnit`. Must convert ton→lbs, qt→gal, etc. before returning.

### 3. Fix Inventory receive flow
**File**: `src/components/farm/PurchasesView.tsx` (line 84)

`addPurchaseToInventory` does `totalQty = line.totalQuantity` and stores it as `unit: baseUnit` (lbs). For a 13-ton purchase, this adds 13 lbs instead of 26,000 lbs.

### 4. Fix Vendor Spending calculations
**File**: `src/lib/vendorSpendingUtils.ts` (line 85-90)

`purchasedByProduct` tracks purchased qty in "planned-usage units" but doesn't convert. A 13-ton AMS purchase subtracts 13 from a 26,505-lbs demand instead of 26,000.

### 5. Fix Purchase-Only Unit Price calculation
**File**: `src/lib/cropCalculations.ts` (lines 561-566)

`calculatePurchaseOnlyUnitPrice` sums `totalQuantity` across lines without converting to a common unit. If one line is in tons and another in lbs, the average is nonsensical.

### 6. Fix Blended Price calculation
**File**: `src/lib/cropCalculations.ts` (lines 520-530)

`calculateBlendedUnitPrice` already calls `convertQuantityToUnit` — this one is actually correct. But `calculatePurchaseOnlyUnitPrice` doesn't, creating inconsistency.

## Implementation

1. Add `convertPurchaseLineToBaseUnit(line, productForm)` that returns qty in lbs or gal
2. Apply it in all 5 broken call sites listed above
3. Audit display: ensure the readiness UI shows "13.0 ton" (the purchase unit) in the "On Order" column, not "lbs" — since the column already shows `{item.plannedUnit}`, the fix is to convert the *number* so 13 ton displays as 26,000 lbs (matching the Need column unit)

## Files to Modify
- `src/lib/cropCalculations.ts` — add helper, fix `calculatePurchaseOnlyUnitPrice`
- `src/components/farm/PlanReadinessView.tsx` — fix `getLineRemainingQty`
- `src/lib/planReadinessUtils.ts` — fix `getLineRemainingQty`
- `src/components/farm/PurchasesView.tsx` — fix `addPurchaseToInventory`
- `src/lib/vendorSpendingUtils.ts` — fix `purchasedByProduct` tracking

