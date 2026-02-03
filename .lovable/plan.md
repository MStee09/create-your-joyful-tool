
# Fix Value Calculations in Order Status

## Problem

The "Ordered" and "To Go" dollar amounts on the Dashboard and Order Status page are dramatically incorrect. The root cause is that value calculations multiply quantities by `product.price` without accounting for **container-based pricing**.

### Example of the Bug

For a product priced at $900/jug (1800g per jug):
- Inventory on hand: 25g
- **Buggy calculation:** `25 × $900 = $22,500` (treating $900 as per-gram price)
- **Correct calculation:** `25 × ($900 ÷ 1800) = 25 × $0.50 = $12.50`

The same bug exists in two places:
1. **Dashboard widget** - `src/lib/planReadinessUtils.ts`
2. **Order Status page** - `src/components/farm/PlanReadinessView.tsx`

---

## Solution

Create a utility function that normalizes prices to base units, then use it in both locations.

### Phase 1: Create Price Normalization Utility

Add a helper function that calculates the correct per-unit price:

```typescript
// Get price per base unit (gal/lbs/g), handling container-based pricing
function getNormalizedUnitPrice(product: Product): number {
  const price = product.price || 0;
  
  // Container-based pricing: divide by container size
  if (product.containerSize && product.containerSize > 0) {
    return price / product.containerSize;
  }
  
  // Standard unit-based pricing: use as-is
  return price;
}
```

### Phase 2: Fix Dashboard Calculations

**File: `src/lib/planReadinessUtils.ts`**

Update the value calculation loop to use normalized prices:

```typescript
readiness.items.forEach(item => {
  const product = products.find(p => p.id === item.productId);
  
  // Get normalized price (handles container-based pricing)
  const normalizedPrice = getNormalizedUnitPrice(product);
  
  // On-hand value: normalized price × quantity
  onHandValue += item.onHandQty * normalizedPrice;
  
  // On-order value: use ACTUAL purchase line totals (already correct)
  const actualOrderValue = onOrderValueByProduct.get(item.productId) || 0;
  onOrderValue += actualOrderValue;
  
  // Planned value: normalized price × required quantity
  plannedValue += item.requiredQty * normalizedPrice;
});
```

### Phase 3: Fix Order Status Page Calculations

**File: `src/components/farm/PlanReadinessView.tsx`**

Update the `valueMetrics` calculation to use the same normalization:

```typescript
const valueMetrics = useMemo(() => {
  let onHandValue = 0;
  let onOrderValue = 0;
  let plannedValue = 0;
  
  // Build on-order value from actual purchase totals
  const onOrderValueByProduct = new Map<string, number>();
  scopedPurchases.forEach(p => {
    (p.lines || []).forEach(line => {
      if (line.productId && line.totalPrice) {
        const current = onOrderValueByProduct.get(line.productId) || 0;
        onOrderValueByProduct.set(line.productId, current + line.totalPrice);
      }
    });
  });

  readiness.items.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    
    // Get normalized price (handles container-based pricing)
    const normalizedPrice = getNormalizedUnitPrice(product);

    onHandValue += item.onHandQty * normalizedPrice;
    
    // Use actual purchase totals for on-order value
    const actualOrderValue = onOrderValueByProduct.get(item.productId) || 0;
    onOrderValue += actualOrderValue;
    
    plannedValue += item.requiredQty * normalizedPrice;
  });

  const shortValue = Math.max(0, plannedValue - onHandValue - onOrderValue);
  const coveragePct = plannedValue > 0 
    ? Math.min(100, ((onHandValue + onOrderValue) / plannedValue) * 100)
    : 100;

  return { onHandValue, onOrderValue, plannedValue, shortValue, coveragePct };
}, [readiness.items, products, scopedPurchases]);
```

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/planReadinessUtils.ts` | Add `getNormalizedUnitPrice()`, update value calculations |
| `src/components/farm/PlanReadinessView.tsx` | Import/add helper, update `valueMetrics`, use purchase totals for on-order |

### Price Normalization Logic

```typescript
function getNormalizedUnitPrice(product: Product | undefined): number {
  if (!product) return 0;
  const price = product.price || 0;
  
  // Container-based pricing (jug, bag, case, tote with containerSize)
  if (product.containerSize && product.containerSize > 0) {
    return price / product.containerSize;
  }
  
  // Standard per-unit pricing
  return price;
}
```

### On-Order Value Strategy

For "On Order Value", we already fixed this in `planReadinessUtils.ts` to use actual purchase line `totalPrice` values. The same fix needs to be applied to `PlanReadinessView.tsx` for consistency.

This ensures that:
- **On Hand** and **Planned** values use normalized product prices
- **On Order** values use the actual dollar amounts from purchase records

---

## Expected Results

### Before Fix
- Dashboard: "$22,500 Ordered" (wrong - treating $900/jug as $900/g)
- Order Status: "$22,500 On Order Value" (same bug)

### After Fix
- Dashboard: "$1,800 Ordered" (correct - 2 jugs × $900)
- Order Status: "$1,800 On Order Value" (consistent with purchases)

The "To Go" amount will also be corrected since it's calculated as `Planned - OnHand - OnOrder`.
