
Goal: make pricing behavior consistent everywhere so booked volume is always valued, remaining volume is priced from current system pricing, and every screen shows a cost.

1) What is currently breaking
- Blending bug: `calculateBlendedUnitPrice()` supports `totalDemand`, but `calculateApplicationCostPerAcreWithPriceBook()` never passes demand, so it often uses purchase-only average instead of true purchased+remaining weighted blend.
- Inconsistent UI math: several views still use raw `product.price` (or `app.rate * product.price`) instead of the pricing engine, which causes $0 lines even when booked purchases exist.
- Context gating bug in `PassCard`: it disables price-book-aware calculations when `priceBook.length === 0`, even though purchases/estimated prices may exist.
- Missing purchase inputs in some views: e.g. row-level costs in print/field/export paths do not always pass purchases into pricing.
- Season bleed risk: pricing functions receive `simplePurchases` without strict current-season scoping in some call paths.

2) Implementation design (single source of truth)
- Create one shared “effective unit price resolver” in `src/lib/cropCalculations.ts` (or extracted helper):
  - Inputs: product, season context, scoped purchases, price book, estimated price, optional price records/vendor offering.
  - Output: effective unit price + source + blend breakdown.
- Enforce hierarchy for current price of remaining demand:
  1. current season price book (product/spec match)
  2. latest non-zero vendor quote in system (offering and/or price record)
  3. product estimated price
  4. legacy product price fallback
- Blend formula:
  - purchased portion uses actual booked/ordered/received weighted average
  - remaining portion uses current hierarchy price
  - blended = `(purchasedQty*avgPurchased + remainingQty*currentPrice)/totalDemand`
  - if no current price exists, fall back to purchase-only unit price (so cost still renders when booked exists)

3) Where to apply it across the app
- `src/lib/cropCalculations.ts`
  - Add demand-aware blending path and season-scoped purchase filtering.
  - Pass/consume total demand per product (from planned usage) for true weighted blending.
- `src/components/farm/CropPlanningView.tsx`
  - Build a per-product demand map once and pass into pricing context.
  - Replace compact expanded-row direct price math with pricing-engine result.
- `src/components/farm/PassCard.tsx`
  - Remove `priceBook.length > 0` gate; always use price context when product masters exist.
- `src/components/farm/ProductRowReadable.tsx`
  - Stop local raw price math; accept and render computed effective cost/source from shared engine.
- `src/components/farm/CropPlanPrintView.tsx`
  - Ensure row-level `calculateApplicationCostPerAcreWithPriceBook(...)` includes purchases/context (not just summary).
- `src/lib/fieldComparisonUtils.ts` and `src/lib/fieldPlanCalculations.ts`
  - Route cost math through same effective-price resolver for field-level parity.
- `src/components/EnhancedExportView.tsx`
  - Replace direct `product.price` export math with shared pricing engine so CSV matches UI.
- `src/FarmCalcApp.tsx`
  - Scope purchases to current season before building price contexts/snapshots.

4) “Current price in system” reliability
- Ensure price records and vendor offering price stay in sync when purchases/quotes are logged:
  - update flow in `src/hooks/useSupabaseData.ts` (or centralized handler) so non-zero latest quote/purchase updates offering for that vendor/product.
- This prevents “booked exists but current price looks empty” scenarios.

5) Validation checklist after implementation
- AMS case: booked 13 ton @ $540 with remaining unmet demand shows non-zero blended cost in crop plans (not blank/$0).
- Same blended result appears consistently in:
  - Crop Planning cards + compact rows
  - Dashboard totals
  - Print/PDF
  - Field comparison
  - Exports
- If only booked price exists and no quote/estimate, cost still appears from purchase-only fallback.
- Purchases from another season do not affect current season costs.
