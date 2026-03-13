

# Fix Vendor Offerings: Make Price Read-Only, Synced from Price Records

## The Problem

The `VendorOfferingsTable` still lets users directly edit the price, price unit, and last quoted date on vendor offerings. This creates stale/conflicting data because price records are the source of truth but the offering price can be independently changed. The `syncOfferingToLatest` logic in `ProductPriceHistory` exists but gets overwritten whenever someone clicks into the offerings table and edits a price there.

## The Fix

Vendor offerings become a **relationship + metadata** table. Price fields are read-only, always derived from the latest price record for that vendor+product pair. Users edit prices through Price History only.

## Changes

### 1. `VendorOfferingsTable.tsx` -- Make price columns read-only

- **Remove** the editable price input, price unit dropdown, and last quoted date input from edit mode
- **Display** price, price unit, and last quoted date as read-only text (same as non-edit mode)
- Add a small label or tooltip: "Price synced from latest price record"
- If no price record exists (price is 0), show "No price -- log a quote" with a muted style
- **Keep editable**: vendor selection, packaging, SKU, container size/unit, min order, freight terms, preferred star -- these are offering-specific metadata that doesn't come from price records
- Remove the price/priceUnit/lastQuotedDate fields from the add form too -- when adding a new vendor offering, price starts at 0 and gets populated when the user logs a quote via Price History

### 2. `VendorOfferingsTable.tsx` -- Add "Log Quote" shortcut

- Add a small button next to the read-only price that says "Update" or has a pencil icon
- This triggers a callback `onLogQuote?.(vendorId)` that the parent can use to open the LogQuoteModal pre-filled with that vendor
- New optional prop: `onLogQuote?: (vendorId: string) => void`

### 3. `ProductDetailView.tsx` -- Wire the Log Quote shortcut

- Add state for `logQuoteVendorId`
- Pass `onLogQuote` to `VendorOfferingsTable` that sets this state
- Render `LogQuoteModal` when `logQuoteVendorId` is set, pre-selecting the product and vendor
- On save, the existing `syncOfferingToLatest` in `ProductPriceHistory` handles updating the offering price automatically

## Files to Modify

| File | Change |
|------|--------|
| `src/components/farm/VendorOfferingsTable.tsx` | Make price/priceUnit/lastQuotedDate read-only in edit mode and add form; add `onLogQuote` prop with "Update" button next to price |
| `src/components/farm/ProductDetailView.tsx` | Wire `onLogQuote` callback to open LogQuoteModal with pre-selected vendor |

