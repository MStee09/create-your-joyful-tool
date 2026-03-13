
# Unified Pricing Engine — IMPLEMENTED

## Summary
All cost calculations across the app now flow through `calculateApplicationCostPerAcreWithPriceBook()` which implements a strict hierarchy:

1. **Booked/purchased volume** → weighted average of actual purchase prices
2. **Remaining unordered volume** → current system price from hierarchy:
   - Season price book entry
   - Vendor offering price (via `product.price`)
   - ProductMaster `estimatedPrice`
   - Legacy `product.price` fallback
3. **Blended result** = `(purchasedQty × avgPurchased + remainingQty × currentPrice) / totalDemand`
4. If no current price exists but purchases do → purchase-only average (never $0)

## Files Changed

| File | Change |
|------|--------|
| `src/lib/cropCalculations.ts` | Enhanced price hierarchy: added vendor offering price as step 2 before estimated price. Season-scoped purchase filtering. Purchase-first lookup so booked volume always has a cost. Added `getPricingSource()` resolver for UI transparency badges. |
| `src/components/farm/PassCard.tsx` | Removed `priceBook.length > 0` gate — pricing context now created whenever `productMasters.length > 0` so purchases/estimated prices drive cost even without price book entries. |
| `src/components/farm/ProductRowReadable.tsx` | Replaced 47 lines of raw `product.price` math with single call to `calculateApplicationCostPerAcreWithPriceBook()`. Added `purchases` prop. Added pricing source badges (Bid/Booked/Blend/Est/List). |
| `src/components/farm/CropPlanningView.tsx` | Compact table sub-rows now use `calculateApplicationCostPerAcreWithPriceBook()` instead of `app.rate * product.price`. Reset scroll-to-hide header on tab switch. |
| `src/components/farm/CropPlanPrintView.tsx` | Added missing `purchases` parameter to per-application cost calculation. |
| `src/components/EnhancedExportView.tsx` | CSV export now uses unified pricing engine. Added `productMasters`, `priceBook`, `purchases` props. |
| `src/FarmCalcApp.tsx` | Wired new props to `EnhancedExportView` and `FieldComparisonView`. |

---

# Phase 1 UX Polish — IMPLEMENTED

| Fix | Files |
|-----|-------|
| Reset scroll-to-hide header on tab switch | `CropPlanningView.tsx` |
| Pass `purchases` to FieldComparisonView for pricing parity | `FieldComparisonView.tsx`, `fieldComparisonUtils.ts`, `FarmCalcApp.tsx` |
| Dashboard crop rows clickable → navigate to crop plans | `DashboardView.tsx` |
| Pricing source indicator badges (Bid/Booked/Blend/Est/List) | `cropCalculations.ts`, `ProductRowReadable.tsx` |
