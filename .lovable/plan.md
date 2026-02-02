
## Restriction Engine ✅ COMPLETED

### Overview
Built a validation engine that checks planned and recorded applications against agronomic constraints. Warnings act as a "thinking partner"—users can override with a recorded reason rather than being hard-stopped.

---

### Restriction Types Checked

1. **Rotation History** — Validates previous crops on the field against product rotation restrictions
2. **Pre-Harvest Interval (PHI)** — Days required between application and harvest
3. **Re-Entry Interval (REI)** — Worker safety timing (informational only)
4. **Seasonal Maximum Rate** — Cumulative rate limits per product per season
5. **Max Rate Per Application** — Single application rate limits
6. **Max Applications Per Season** — Count limits per product

---

### How It Works

- Restrictions are defined in `ChemicalData.restrictions` on each product
- When recording an application, the system checks all products against all selected fields
- **Errors** (PHI, max rate violations) block saving until acknowledged
- **Warnings** (rotation, REI) show for review but don't block
- Users must provide an override reason and confirm checkbox to proceed
- Overridden warnings are saved with the application record for audit

---

### Implementation

- `src/lib/restrictionEngine.ts` — Core validation logic
- `src/components/farm/applications/RestrictionWarningPanel.tsx` — UI for displaying and overriding warnings
- `RecordApplicationModal` — Integrated restriction checks on product/field selection

---

## Inventory View: Add "Ordered" Section ✅ COMPLETED

### Overview
Enhanced the Inventory view to show products that are **ordered but not yet received** alongside the existing "On Hand" inventory.

---

### What You'll See

**Tab Layout:**
- **All** — Combined view showing both On Hand + Ordered (default)
- **On Hand** — Current physical inventory
- **Ordered** — Products with pending deliveries

---

### Implementation Complete
- ✅ Added `purchases` prop to InventoryView (SimplePurchase[])
- ✅ Filter purchases by `status === 'ordered'` and current season
- ✅ Tab bar: All | On Hand | Ordered
- ✅ Summary cards show On Hand value + Ordered value separately

---

## Actual vs. Planned Application Report ✅ COMPLETED

### Overview
Built a variance report comparing **recorded field applications** against **crop plan targets** by product, field, and timing.

---

### What It Shows

**Summary Cards:**
- Passes Planned — unique crop/timing combinations
- Passes Started — at least one application recorded
- Passes Complete — all products fully applied
- Progress bar — percentage of passes complete

**Per-Product Row:**
- Planned rate and total (from crop plan, weighted by tier)
- Actual rate and total (from recorded applications)
- Rate variance (actual - planned, with %)
- Total variance (actual - planned, with %)
- Status badge: Not Applied | Partial | Complete | Over Applied

---

### Filters
- Filter by status (Not Applied, Partial, Complete, Over Applied)
- Filter by crop

---

### Implementation
- `src/lib/applicationVarianceUtils.ts` — Core calculation logic
- `src/components/farm/ApplicationVarianceView.tsx` — UI component
- Added to sidebar under **Review** section as "Actual vs. Plan"

---

## Nutrient Efficiency Report ✅ COMPLETED

### Overview
Built a report comparing **planned N-P-K-S nutrient delivery** against **actual nutrients applied** from recorded applications.

---

### What It Shows

**Whole-Farm Summary:**
- N-P-K-S cards showing planned vs actual lbs/ac
- Weighted by crop acreage for accurate farm-level totals
- Color-coded variance indicators

**Per-Crop Table:**
- Crop name and acres
- Status badge: Not Started | Partial | On Target | Over
- Planned and actual nutrients for N, P, K, S
- Variance shown inline with color coding

---

### Status Logic
- **On Target**: Actual N within ±5% of planned
- **Partial**: Started but under target
- **Over**: Actual N exceeds plan by >5%

---

### Implementation
- `src/lib/nutrientEfficiencyUtils.ts` — Core calculation logic
- `src/components/farm/NutrientEfficiencyView.tsx` — UI component
- Added to sidebar under **Review** section as "Nutrient Efficiency"

---

## Application History View ✅ COMPLETED

### Overview
Timeline view showing all recorded field applications with filtering by field and crop.

---

### Features
- **Summary cards**: Total applications, fields covered, total acres treated
- **Filters**: By field and by crop
- **Grouped by date**: Most recent first with visual timeline
- **Expandable cards**: Click to see product details, applicator, equipment, notes
- **Export CSV**: Download full history as spreadsheet

---

### Implementation
- `src/components/farm/applications/ApplicationHistoryView.tsx` — UI component
- Added to sidebar under **Review** section as "Application History"

---

## Inventory Shortage Modal ✅ COMPLETED

### Overview
Modal that appears when recording an application with insufficient inventory.

---

### Resolution Options
1. **Record Purchase** — Open purchase form to add incoming product
2. **Add Carryover** — Add existing product from last season
3. **Save Anyway** — Record application without deducting (shows negative balance)

---

### Implementation
- `src/components/farm/applications/InventoryShortageModal.tsx` — Modal component
- Can be integrated into RecordApplicationModal when shortages detected

---

## Report Exports ✅ COMPLETED

### Overview
CSV export functionality for all variance and history reports.

---

### Export Functions
- `exportApplicationVarianceCsv()` — Actual vs. Plan report with all product rows
- `exportNutrientEfficiencyCsv()` — N-P-K-S by crop with farm totals
- `exportApplicationHistoryCsv()` — Full application history by date

---

### Implementation
- `src/lib/reportExportUtils.ts` — Export utility functions
- Export buttons added to all three Review section views
