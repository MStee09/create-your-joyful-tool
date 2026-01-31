# Unified Procurement Command Center

## ✅ IMPLEMENTED

### Changes Made

1. **Restored Plan Readiness Route** - `src/FarmCalcApp.tsx`
   - `plan-readiness` now renders `PlanReadinessView` instead of redirecting to Dashboard

2. **Updated PlanReadinessView for SimplePurchase** - `src/components/farm/PlanReadinessView.tsx`
   - Changed props from `orders: Order[]` to `purchases: SimplePurchase[]`
   - Updated readiness engine accessors to work with SimplePurchase structure
   - Renamed header from "Plan Readiness" to "Order Status"
   - Updated terminology: Ready→On Hand, On Order→Ordered, Blocking→Need to Order

3. **Reorganized Sidebar Navigation** - `src/FarmCalcApp.tsx`
   - Added new **Procurement** section with: Order Status, Purchases, Vendor Spend
   - Moved Purchases from Inventory section to Procurement section
   - Added Vendor Spend (previously hidden) to sidebar

### Navigation Structure

```text
PLAN
├── Dashboard
├── Crop Plans

PROCUREMENT
├── Order Status     ← Detailed per-product breakdown
├── Purchases        ← Record/track orders
├── Vendor Spend     ← Projected spending by vendor

PRODUCTS
├── Product Catalog
├── Vendors
├── Price History

INVENTORY
├── On Hand
```

### Data Flow

```text
Crop Plans (defines need)
        ↓
   ORDER STATUS
   ┌─────────┬──────────┬─────────────┐
   │  NEED   │ ON HAND  │   ORDERED   │
   │  (plan) │  (inv)   │ (purchases) │
   └─────────┴──────────┴─────────────┘
        ↓
   ┌────────────────┬────────────────┐
   ▼                ▼                ▼
Purchases     Vendor Spend      Inventory
(create)       (project)        (On Hand)
```
