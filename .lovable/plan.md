

# Blended Cost for Partially-Purchased Inputs

## The Problem

Right now, `calculateApplicationCostPerAcreWithPriceBook` uses a single price per product (from price book or estimated). If you bought 20 tons of AMS at $540/ton but still need 15 more tons and the market moved to $700/ton, the crop plan should reflect a blended cost of ~$608/ton -- not just $540 or $700.

## The Formula

```text
blendedPrice = (purchasedQty × avgPurchasedPrice + remainingQty × currentMarketPrice) / totalNeeded
```

Where:
- **purchasedQty** = sum of received purchase quantities for this product/season
- **avgPurchasedPrice** = weighted average of actual purchase prices
- **remainingQty** = totalNeeded - purchasedQty (floored at 0)
- **currentMarketPrice** = latest vendor offering price or price book entry
- **totalNeeded** = demand from crop plans (already calculated by `calculatePlannedUsage`)

If fully purchased, blended price = avg purchased price. If nothing purchased, blended price = current market price. This is exactly what you described.

## What Changes

### 1. New utility: `calculateBlendedPrice` in `src/lib/cropCalculations.ts`

A function that takes a product ID, season year, purchases, price records, price book, and planned demand, then returns the blended $/unit. It:
- Sums purchased quantities and costs from `purchases` line items for that product+season
- Gets the "unpurchased" price from the price book or latest vendor offering
- Returns the weighted average

### 2. Expand `PriceBookContext` interface

Add optional fields so the blended calculation has the data it needs:
- `purchases` (the season's purchase records)
- `plannedUsage` (total demand per product, already computed elsewhere)

These are optional so existing call sites don't break -- they just won't get blended pricing until wired up.

### 3. Update `calculateApplicationCostPerAcreWithPriceBook`

Before falling back to the single price book price, check if purchase data is available in the context. If so, compute the blended price for that product and use it instead. The priority becomes:

1. **Blended price** (if purchases exist in context and product has partial purchases)
2. Price book entry (awarded/manual -- used as the "unpurchased" component of the blend, or standalone if no purchase data)
3. Estimated price fallback

### 4. Wire purchase data into `PriceBookContext` at the top level

In the components that build the `PriceBookContext` (`CropPlanningView`, `DashboardView`, `PassCard`, `CropPlanPrintView`), pass the `purchases` array that's already available in those views from `FarmCalcApp` props.

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/cropCalculations.ts` | Add `calculateBlendedPrice` function; expand `PriceBookContext` with optional `purchases` and `plannedUsage`; update `calculateApplicationCostPerAcreWithPriceBook` to use blended price |
| `src/components/farm/CropPlanningView.tsx` | Pass `purchases` into `priceBookContext` |
| `src/components/farm/DashboardView.tsx` | Pass `purchases` into `priceBookContext` |
| `src/components/farm/PassCard.tsx` | Pass `purchases` into `priceBookContext` |
| `src/components/farm/CropPlanPrintView.tsx` | Pass `purchases` into `priceBookContext` |

## Edge Cases

- Product fully purchased: blended = avg purchase price only
- Product not purchased at all: blended = current market/price book price (no change from today)
- Purchased more than planned: blended = avg purchase price (remaining = 0)
- No price book entry AND no purchases: falls back to estimated price as today

