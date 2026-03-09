

# Crop Plan Cost History — Track How Costs Change Over Time

## The Problem

The dashboard shows up/down arrows comparing crop cost/acre to the farm average, but those are static comparisons — not a timeline. There's no way to see how a crop's total cost has evolved as you've edited the plan, changed prices, or recorded purchases throughout the season. You want to see: "My corn plan started at $180/ac in January, jumped to $210 in March when fertilizer spiked, then came down to $195 after I locked in a purchase."

## The Solution

**Snapshot crop plan costs on every meaningful change** and store them in a new database table. Display a small sparkline-style chart on both the Dashboard (per crop) and the Crop Planning view (hero area).

## Data Model

New table: `crop_plan_cost_snapshots`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK to auth.users |
| season_year | int | e.g. 2026 |
| crop_id | text | Which crop |
| cost_per_acre | numeric | Snapshot value |
| total_cost | numeric | Snapshot value |
| snapshot_reason | text | What triggered it: `plan_edit`, `price_change`, `purchase_recorded`, `manual` |
| created_at | timestamptz | When the snapshot was taken |

RLS: users can only read/write their own rows.

## Snapshot Triggers

Record a snapshot whenever:
1. **Crop plan saved** — user adds/removes/edits a pass or product (already goes through `onUpdate` in CropPlanningView)
2. **Price record logged/edited/deleted** — affects blended cost (already goes through ProductPriceHistory handlers)
3. **Purchase recorded** — changes blended cost (already goes through purchase save handlers)

Implementation: a single `saveCostSnapshot(seasonYear, cropId, costPerAcre, totalCost, reason)` function called from `FarmCalcApp.tsx` after the relevant state updates. We recalculate the cost using the existing `calculateSeasonSummaryWithPriceBook` and only save if the cost actually changed from the last snapshot.

## UI Changes

### 1. Dashboard — Mini sparkline per crop row

In the Crop Cost Summary table, replace or augment the static up/down arrow with a tiny inline sparkline (using Recharts `LineChart`, ~80x24px) showing cost/acre over time. Tooltip on hover shows date + value. The arrow becomes meaningful: it compares current cost to the previous snapshot.

### 2. Crop Planning View — Cost trend card

Add a small card above the passes (near SeasonOverviewBar) with:
- A line chart (~300x100px) showing cost/acre snapshots for this crop over the current season
- X-axis: dates, Y-axis: $/acre
- A subtitle like "Cost/ac trend — 12 snapshots since Jan"
- Delta badge: "+$14.20/ac since plan started" or "-$8.50/ac since last edit"

Both charts use the same data from `crop_plan_cost_snapshots`, filtered by season_year + crop_id.

## Files to Modify/Create

| File | Change |
|------|--------|
| **Migration SQL** | Create `crop_plan_cost_snapshots` table with RLS |
| `src/hooks/useSupabaseData.ts` | Add `saveCostSnapshot` and `getCostSnapshots` functions |
| `src/FarmCalcApp.tsx` | Call `saveCostSnapshot` after crop plan updates, price changes, and purchase saves |
| `src/components/farm/DashboardView.tsx` | Fetch snapshots, render mini sparklines in the crop cost table, make arrows compare to previous snapshot |
| `src/components/farm/CropPlanningView.tsx` | Fetch snapshots for current crop, render cost trend card with line chart and delta badge |

