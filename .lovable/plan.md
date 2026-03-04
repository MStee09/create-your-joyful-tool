

# Fix: Pass Vendor Offerings Through to LogQuoteModal Everywhere

## The Problem

The `LogQuoteModal` code already has the filtering logic (from the last edit), but it's not working because `vendorOfferings` is never passed to it in the `ProductPriceHistory` component. The chain is broken:

- `ProductDetailView` HAS `vendorOfferings` but doesn't pass it to `ProductPriceHistory`
- `ProductPriceHistory` doesn't accept `vendorOfferings` as a prop, so it can't pass it to `LogQuoteModal`
- `LogQuoteModal` falls back to showing all vendors when `vendorOfferings` is undefined

The `PriceHistoryView` call DOES pass `vendorOfferings`, but the `ProductPriceHistory` calls do not.

## Fix

### 1. `ProductPriceHistory.tsx` — Add `vendorOfferings` and `onUpdateOfferings` to props

Add `vendorOfferings` and `onUpdateOfferings` to the `ProductPriceHistoryProps` interface, then pass them through to both `LogQuoteModal` instances in this file.

### 2. `ProductDetailView.tsx` — Pass `vendorOfferings` and `onUpdateOfferings` to `ProductPriceHistory`

The component already has `vendorOfferings` and `onUpdateOfferings` as props. Just wire them through to the `<ProductPriceHistory>` call.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/farm/ProductPriceHistory.tsx` | Add `vendorOfferings` and `onUpdateOfferings` to props interface; pass them to both `LogQuoteModal` instances |
| `src/components/farm/ProductDetailView.tsx` | Pass `vendorOfferings` and `onUpdateOfferings` to `<ProductPriceHistory>` |

