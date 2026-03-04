

# Unified Pricing Experience Redesign

## The Problem

Pricing is scattered across 4+ places with confusing overlapping concepts:

1. **Vendor Offerings** (Product Detail → Vendors tab) — current price per vendor, "Last Quoted" date
2. **Price History** (sidebar nav) — historical price records table with "Log Quote" button
3. **Price Book** (procurement) — commodity bid prices by season
4. **Product Price History** (product detail page) — chart + table of price records
5. **Log Quote Modal** — creates a `price_record` entry

The user's core confusion: "How is 'Log a Quote' different from updating a vendor offering price?" They feel like the same action but live in different places and write to different tables (`price_records` vs `vendor_offerings`).

## Design Principles

- **One place to update prices** — updating a vendor offering price should automatically log a price record
- **Rename "Log Quote"** to "Update Price" — clearer intent
- **Unified Pricing view** — replace the current Price History with a richer view showing trends by product, vendor, and time
- **Inline quick-edit** — allow price updates directly from the unified view without navigating to individual product pages

## Plan

### 1. Auto-log price records when vendor offerings change

**File:** `src/FarmCalcApp.tsx` (or wherever `onUpdateOfferings` handler lives)

When a user updates a vendor offering price (or adds a new offering), automatically create a `price_record` entry with type `'quote'`. This eliminates the need to separately "log a quote" — updating a vendor price IS logging a quote.

- In the offering save handler, after persisting the offering update, call `addPriceRecord()` with the new price, vendor, product, and today's date
- This means vendor offerings and price history stay in sync automatically

### 2. Redesign Price History View → "Pricing" view

**File:** `src/components/farm/PriceHistoryView.tsx` (rewrite)

Replace the current sparse table with a unified pricing dashboard:

**Header section:**
- Rename to **"Pricing"** (simpler, clearer)
- Replace "Log Quote" button with **"Update Price"** button that opens a streamlined modal

**Quick Price Update table (new, top section):**
- Flat table of all products with their current vendor offering prices
- Each row: Product name | Vendor | Current Price | Last Updated | inline edit button
- Click the price cell to edit inline — saves to both `vendor_offerings` AND creates a `price_record`
- Filter by vendor, category
- This is the "less clicking" fast-update experience

**Trend History section (below):**
- Pivot table: rows = products, columns = months or seasons
- Each cell shows the price at that point in time (from `price_records`)
- Color coding: green = price dropped, red = price increased vs previous period
- Filter by vendor to see one vendor's pricing over time
- Toggle between monthly and yearly view

**Insights cards (keep existing):**
- Biggest increases / decreases (already exists, keep it)

### 3. Streamline the "Update Price" modal

**File:** `src/components/farm/LogQuoteModal.tsx` (modify)

- Rename title from "Log Price Quote" to "Update Price"
- Add a checkbox: "Also update vendor offering" (checked by default)
- When checked, saving updates both the `price_record` AND the matching `vendor_offering` price + `lastQuotedDate`
- This eliminates the confusion of two separate workflows

### 4. Update navigation label

**File:** `src/FarmCalcApp.tsx`

- Change sidebar label from "Price History" to "Pricing"

### 5. Update Product Detail price history section

**File:** `src/components/farm/ProductPriceHistory.tsx`

- Rename "Log Quote" button to "Update Price"  
- Keep the existing chart and table — they work well for single-product context

## Files to Modify

| File | Change |
|------|--------|
| `src/components/farm/PriceHistoryView.tsx` | Major rewrite: add quick-edit table, trend grid, rename |
| `src/components/farm/LogQuoteModal.tsx` | Rename to "Update Price", add "also update offering" checkbox |
| `src/components/farm/ProductPriceHistory.tsx` | Rename button labels |
| `src/FarmCalcApp.tsx` | Rename nav label, pass `vendorOfferings` + `onUpdateOfferings` to PriceHistoryView, auto-log price records on offering changes |

## Quick-Edit Table Preview

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Pricing                                              [Update Price] │
│ Update prices and track trends across all products                  │
├──────────────────────────────────────────────────────────────────────┤
│ Filter: [All Vendors ▼]  [All Categories ▼]  🔍 Search...          │
├──────────────────────────────────────────────────────────────────────┤
│ Product          │ Vendor        │ Price     │ Updated   │          │
│──────────────────│───────────────│───────────│───────────│──────────│
│ Urea 46-0-0      │ Nutrien       │ $485/ton  │ Jan 2026  │ [Edit]   │
│ Urea 46-0-0      │ CHS           │ $492/ton  │ Dec 2025  │ [Edit]   │
│ AMS 21-0-0-24S   │ Nutrien       │ $310/ton  │ Feb 2026  │ [Edit]   │
│ Humic Acid 12%   │ AgriSolutions │ $148/gal  │ Mar 2026  │ [Edit]   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ Price Trends                    [Monthly ▼]  [1 Year ▼]             │
├──────────────────────────────────────────────────────────────────────┤
│ Product          │ Mar 26 │ Feb 26 │ Jan 26 │ Dec 25 │ Change      │
│──────────────────│────────│────────│────────│────────│─────────────│
│ Urea 46-0-0      │  $485  │  $460  │  $440  │  $425  │ ▲ +14.1%   │
│ AMS 21-0-0-24S   │  $310  │  $315  │  $320  │  $318  │ ▼ -2.5%    │
│ Humic Acid 12%   │  $148  │  $148  │  $145  │  $145  │ ▲ +2.1%    │
└──────────────────────────────────────────────────────────────────────┘
```

