
# Fix Value Calculations for Ton-Priced Products

## Root Cause Identified

The **"On Order"** and **"To Go"** dollar amounts are massively inflated because `getPlannedUnitPrice()` returns the raw product price without considering unit conversions.

### The Bug

For a product like **AMS** (Ammonium Sulfate):
- Price: **$420/ton**
- Planned usage calculated in **lbs** (e.g., 13,200 lbs)

Current calculation:
```
plannedValue = 13,200 lbs × $420 = $5,544,000 ❌
```

Correct calculation:
```
pricePerLb = $420 / 2000 = $0.21/lb
plannedValue = 13,200 lbs × $0.21 = $2,772 ✓
```

This bug affects all products priced per **ton** but measured in **lbs**, causing values to be inflated by ~2000x.

---

## Solution

Update `getPlannedUnitPrice()` in `src/lib/planReadinessUtils.ts` to normalize prices to match the unit returned by `calculatePlannedUsage()`:

**For standard dry products (priced per ton):**
- Divide price by 2000 to get per-lb price
- The planned quantity is always in lbs

**For container-based products (priced per jug/bag):**
- Return price as-is (planned qty is already in containers)

**For standard liquid products (priced per gal):**
- Return price as-is (planned qty is already in gal)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/planReadinessUtils.ts` | Update `getPlannedUnitPrice()` to handle ton → lbs conversion |

---

## Updated Code

```typescript
/**
 * Get price for valuing PLANNED usage quantities.
 * 
 * calculatePlannedUsage() returns quantities in:
 *   - Container-based products: containers (jugs, bags, etc.) 
 *   - Standard liquid products: gallons
 *   - Standard dry products: lbs (NOT tons!)
 * 
 * So we need to normalize the price to match these units.
 */
export function getPlannedUnitPrice(product: Product | undefined): number {
  if (!product) return 0;
  const price = product.price || 0;
  
  // Container-based pricing: price is per container, planned qty is in containers
  const isContainerPricing = ['jug', 'bag', 'case', 'tote'].includes(product.priceUnit || '');
  if (isContainerPricing) {
    return price; // Already matches
  }
  
  // Ton pricing: convert to per-lb since planned qty is in lbs
  if (product.priceUnit === 'ton') {
    return price / 2000;
  }
  
  // Standard per-unit pricing (gal, lbs): already matches
  return price;
}
```

---

## Why This Also Fixes "On Order" Value

The "On Order" value uses `line.totalPrice` from actual purchase records, which is already correct. However, when calculating `shortValue`:

```typescript
shortValue = plannedValue - onHandValue - onOrderValue
```

If `plannedValue` is inflated 2000x, then `shortValue` is also massively wrong. Fixing `plannedValue` will cascade to fix `shortValue` (the "To Go" amount).

---

## Expected Results

### Before Fix
- Planned Value: ~$5,544,000 (wrong - treating $420/ton as $420/lb)
- On Order Value: ~$27,000 (correct - from actual purchases)
- Short Value (To Go): ~$5,517,000 (wrong)

### After Fix
- Planned Value: ~$30,000 (correct - $420/ton ÷ 2000 = $0.21/lb)
- On Order Value: ~$27,000 (unchanged - already correct)
- Short Value (To Go): ~$3,000 (correct)

---

## Testing Checklist

After implementation:
1. Dashboard Order Status widget should show reasonable $ values
2. Order Status detail page should show matching values
3. Products priced per ton (AMS, Urea, KCL, SOP) should contribute proportionally small amounts
4. Container-priced products (PiKSi Dust) should still calculate correctly
5. Standard liquid products (Humic Acid 12%) should still calculate correctly
