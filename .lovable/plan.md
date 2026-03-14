

# Fix: Cost Trend Badge — Accuracy & Consistency

## Problems

1. **Wrong comparison baseline** — The delta badge compares the **first-ever snapshot** (e.g., Dec 16) to today's live cost. So if Dec 16 was $243 and today is $238, it shows "−$5.14/ac" even though the chart visually shows the cost *increased* from yesterday to today. The badge contradicts what the user sees on the chart.

2. **Missing badge on some crops** — The `Math.abs(delta) >= 0.50` threshold hides the badge entirely when the first-to-current change is small, even if there's meaningful recent movement. This creates inconsistency across crops.

## Fix

**Change the delta to compare the previous day's value to today's current value** — this matches what the user visually reads on the chart (the slope of the last segment).

In `src/components/farm/CostTrendCard.tsx`:

- **Delta calculation**: Instead of `currentCostPerAcre - first.cost`, use `currentCostPerAcre - previousPoint.cost` where `previousPoint` is the second-to-last data point.
- **Always show the badge**: Remove the `>= 0.50` threshold so every crop consistently displays its trend. If delta is effectively zero (< $0.01), show "No change" or a neutral "—" indicator.
- **Label clarity**: Add "vs yesterday" or "vs prev" to the badge so users understand the comparison window.

### Single file change: `src/components/farm/CostTrendCard.tsx`

```
// Before (line 37):
const delta = data.length >= 2 ? currentCostPerAcre - first.cost : 0;

// After:
const prevPoint = data.length >= 2 ? data[data.length - 2] : null;
const delta = prevPoint ? currentCostPerAcre - prevPoint.cost : 0;
```

Badge always renders — shows neutral state when delta ≈ 0, and includes "vs prev" label for clarity.

