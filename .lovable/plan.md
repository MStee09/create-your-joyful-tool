

# Add Price Trend Chart to Pricing Dashboard

## What You Get

A multi-line chart at the top of the Pricing page that visualizes every price update ever recorded. Each line represents a vendor's price for a selected product over time, so you can instantly see:

- **Cost impact** -- where prices are now vs. where they were when you last bought
- **Which vendor is cheapest** -- lines stacked visually, lowest line = best deal
- **When to buy** -- seasonal dips become visible patterns over months/years

## How It Works

**Product selector** above the chart lets you pick one product (or "All Products" for an overview). When a product is selected, one line per vendor appears showing every recorded price point (quotes and purchases) plotted by date. When "All Products" is selected, it shows the average price trend across your catalog.

**Every data point matters** -- unlike the current pivot table that shows one price per month, the chart plots every individual price record as a dot on the line, so you never lose granularity.

**Vendor comparison callout** below the chart shows: lowest current price, highest current price, and the spread (e.g., "Nutrien is $7/ton cheaper than CHS right now").

## Files to Modify

| File | Change |
|------|--------|
| `src/components/farm/PriceHistoryView.tsx` | Add Recharts `LineChart` section above the existing quick-edit table, with product selector and vendor comparison summary |

## Technical Approach

1. **Import Recharts** (`LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`, `Legend`, `ReferenceLine`) -- already a project dependency used in `ProductPriceHistory.tsx`

2. **New state**: `selectedChartProduct` (product ID or `'all'`)

3. **Chart data builder** (`useMemo`):
   - Filter `priceRecords` by selected product
   - Sort by date ascending
   - Build data points: `{ date: "2025-03-15", [vendorId]: normalizedPrice, ... }`
   - One line per vendor, color-coded (reuse `VENDOR_COLORS` pattern from `ProductPriceHistory`)
   - Include both quotes and purchases (differentiate with dot style: filled = purchase, hollow = quote)

4. **Vendor comparison card**: For the selected product, show each vendor's latest price sorted low-to-high, with a "Best price" badge on the cheapest and a savings callout

5. **Layout**: Chart card sits between the Insights cards and the Quick Price Update table

```text
┌─────────────────────────────────────────────────────────┐
│ Price Trends                    [Product: Urea 46-0-0 ▼]│
│                                                          │
│  $500 ┤                                          ● Nutrien│
│  $480 ┤                                    ●──────        │
│  $460 ┤                          ●────●───╱               │
│  $440 ┤              ●──────●──╱                  ○ CHS   │
│  $420 ┤    ●────●──╱                                      │
│       └──┬──────┬──────┬──────┬──────┬──────┬─────        │
│        Oct   Nov   Dec   Jan   Feb   Mar                  │
│                                                          │
│  Best price: Nutrien at $485/ton                         │
│  CHS is $7/ton higher ($492/ton)                         │
└─────────────────────────────────────────────────────────┘
```

The existing quick-edit table and pivot trend table remain below unchanged.

