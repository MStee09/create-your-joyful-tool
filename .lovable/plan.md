

# Redesign Product Price History: Chart-First Layout

## What Changes

The current layout buries the chart -- it's a small 192px tall chart conditionally rendered, with the table taking equal visual weight. The redesign flips the hierarchy: the trend chart becomes the hero element, and the line items become a compact collapsible detail below.

## Layout

```text
┌─────────────────────────────────────────────────────────┐
│ Price History                          [Update Price]    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │            TREND CHART (280px tall)                 │  │
│  │     Every data point plotted by date (not year)     │  │
│  │     One line per vendor, dots = individual prices   │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  3-Year Change: +$12/ton (+2.5%)           ▲ trending up │
│                                                          │
│  ▸ Recent Prices (8)                    [collapsible]    │
│    Date       Vendor      Price    Package   Type        │
│    Mar 2026   Nutrien     $485/ton  Bulk     ✓ Purchased │
│    ...                                                   │
└─────────────────────────────────────────────────────────┘
```

## Changes in `ProductPriceHistory.tsx`

1. **Chart uses actual dates, not just year buckets** -- currently it groups by year (4 data points). Change to plot every record by its actual date, sorted chronologically. This gives a real timeline users can watch.

2. **Chart height increased** from `h-48` (192px) to `h-72` (288px) -- make it the dominant visual element.

3. **Chart always renders** when there are records (remove the conditional `chartData.some(d => Object.keys(d).length > 1)` guard that hides it). If there's data, show the chart.

4. **Include both purchases AND quotes** in the chart (currently filters to `type === 'purchased'` only). Use filled dots for purchases, hollow dots for quotes so you can see both.

5. **X-axis shows month/year** instead of just year -- `"Mar '25"` format for readable date axis.

6. **Recent prices table wrapped in a Collapsible** -- starts open but can be collapsed so the chart dominates. Uses Radix Collapsible already in the project.

7. **Price change summary stays** between chart and table as a compact insight bar.

| File | Change |
|------|--------|
| `src/components/farm/ProductPriceHistory.tsx` | Rebuild chart data to use actual dates; increase chart height; always show chart; add quote dots; collapsible table |

