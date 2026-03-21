

# Add Per-Product Coverage % + Priority Sort to Order Status

## Problem
Each product row shows raw quantities (Need / On Hand / On Order) but no visual indicator of how much of the total need is covered. When a product has partial coverage (e.g., 13 tons ordered out of 13.25 tons needed = 98% covered), it still shows a "Need to Order" badge with no sense of progress. The user's eyes see "Need to Order" and assume nothing was done.

Additionally, products are unsorted — a product that's 98% covered sits next to one that's 0% covered with no distinction.

## Solution

### 1. Add a coverage progress bar to each product row
Below the status pill in each row, add a small horizontal progress bar showing % of need covered (on-hand + on-order vs required). Color-coded: green for on-hand portion, amber for on-order portion, remaining gray.

Next to it, show the percentage as text: e.g., "98% covered" or "0% covered".

### 2. Sort by coverage ascending (least covered first)
`filteredItems` will be sorted so products with the lowest coverage % appear at the top. This puts the most urgent items front and center. BLOCKING items naturally float to top, but within BLOCKING, a 0% covered product ranks higher than a 90% covered one.

### File: `src/components/farm/PlanReadinessView.tsx`

**In `filteredItems` memo** (line 127-132):
- After filtering by tab, sort by `(onHandQty + onOrderQty) / requiredQty` ascending

**In `renderProductRow`** (line 306-361):
- Calculate `coveragePct = Math.min(100, ((item.onHandQty + item.onOrderQty) / item.requiredQty) * 100)`
- Calculate `onHandPct` and `onOrderPct` segments
- Add a small progress bar (h-1.5 rounded) below the status pill with green + amber segments
- Add text label: `"{coveragePct}% covered"`

