

# Fix "Update Price" Modal: Use Vendor Offerings as Source of Truth

## The Core Issue

You already told the system which vendors sell which products (via vendor offerings). The "Update Price" modal ignores that and shows every vendor and every product, forcing you to re-enter context you already provided. It also starts the price at $0 instead of showing the current price.

**Vendor offerings define the relationship**: "Nutrien sells me Urea 46-0-0 at $485/ton." The Update Price modal should read from that, not make you rebuild it from scratch.

## Changes

### 1. LogQuoteModal: Filter vendors by product's offerings, pre-fill current price

**File:** `src/components/farm/LogQuoteModal.tsx`

When a product is selected:
- **Vendor dropdown only shows vendors that have an offering for that product** (filter `vendorOfferings` by `productId`, then map to vendor names)
- If only one vendor exists, auto-select it
- **Pre-fill the price** from the matching vendor offering's current price so you can adjust it (not start from $0)
- **Pre-fill the unit** from the offering's `priceUnit`

When a vendor is selected (or auto-selected):
- Look up `vendorOfferings.find(o => o.productId === productId && o.vendorId === vendorId)`
- Set `price` to `offering.price`, `unit` to `offering.priceUnit`

This means the flow becomes: pick product -> vendor auto-narrows -> current price pre-filled -> adjust price -> save. Two clicks instead of six fields.

### 2. Remove "Also update vendor offering" checkbox confusion

Since vendor offerings ARE the source of pricing, the checkbox "Also update vendor offering" should be removed -- it should always update the offering. The modal saves to both price history (for the trend chart) and the vendor offering (for the current price) every time.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/farm/LogQuoteModal.tsx` | Filter vendor dropdown by product's offerings, pre-fill price from offering, remove checkbox, always sync offering |

