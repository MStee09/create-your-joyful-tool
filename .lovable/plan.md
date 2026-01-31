

# Unified Procurement Command Center

## Problem Summary

The current system has several disconnected views that should work together:
- **Demand Summary** shows what's needed from crop plans
- **Order Status** (Dashboard widget) shows a summary but redirects back to Dashboard when clicked
- **Vendor Spend** exists but isn't accessible from the sidebar
- **Purchases** tracks orders but doesn't visually connect to the demand
- **Inventory** (On Hand) isn't reflected in Order Status calculations

The user expects a cohesive flow: Plan Demand → Order Status → Purchases → Inventory

---

## Proposed Solution

Create a unified **Procurement** section that connects all these pieces and fix the data flow issues.

### Navigation Changes

| Current | Proposed |
|---------|----------|
| Demand Summary (nav) | Procurement Hub (nav) |
| Order Status (Dashboard widget, no detail) | Order Status (clickable → detailed view) |
| Vendor Spend (hidden) | Vendor Spend (sub-nav under Procurement) |
| Purchases (separate section) | Purchases (sub-nav under Procurement) |

### Sidebar Update

```text
PLAN
├── Dashboard
├── Crop Plans

PROCUREMENT          <- NEW SECTION
├── Order Status     <- Replaces "Demand Summary", shows detailed readiness
├── Purchases        <- Move here from Inventory section
├── Vendor Spend     <- Add to sidebar (currently hidden)

PRODUCTS
├── Product Catalog
├── Vendors
├── Price History

INVENTORY
├── On Hand          <- Keep here
```

---

## Technical Fixes

### 1. Restore Plan Readiness Route

**File:** `src/FarmCalcApp.tsx`

The `plan-readiness` route currently redirects to Dashboard. Fix it to render the detailed view:

```typescript
// Before (lines 1258-1274):
case 'plan-readiness':
case 'variance':
case 'variance-by-pass':
case 'alerts':
  return <DashboardView ... />;

// After:
case 'plan-readiness':
  return (
    <PlanReadinessView
      inventory={state.inventory}
      products={legacyProducts}
      vendors={state.vendors}
      season={currentSeason}
      purchases={simplePurchases || []}
      onUpdateInventory={handleUpdateInventory}
    />
  );
case 'variance':
case 'variance-by-pass':
case 'alerts':
  return <DashboardView ... />;
```

### 2. Update PlanReadinessView to Use SimplePurchase

**File:** `src/components/farm/PlanReadinessView.tsx`

Change the props and internal logic to accept `SimplePurchase[]` instead of legacy `Order[]`:

```typescript
interface PlanReadinessViewProps {
  inventory: InventoryItem[];
  products: Product[];
  vendors: Vendor[];
  season: Season | null;
  purchases: SimplePurchase[];  // Changed from orders: Order[]
  onUpdateInventory: (inventory: InventoryItem[]) => void;
}

// Update computeReadiness call to use SimplePurchase accessors
const readiness = useMemo(() => {
  const scopedPurchases = (purchases || []).filter(p => {
    if (season?.id && p.seasonId !== season.id) return false;
    return p.status === 'ordered';
  });

  return computeReadiness({
    planned: plannedForEngine,
    inventory,
    orders: scopedPurchases,
    orderAccessors: {
      orders: scopedPurchases,
      getOrderId: (p) => p.id,
      getOrderStatus: (p) => p.status,
      getVendorName: (p) => vendors.find(v => v.id === p.vendorId)?.name,
      getLines: (p) => p.lines || [],
      getLineProductId: (l) => l.productId,
      getLineRemainingQty: (l) => l.totalQuantity || (l.quantity * (l.packageSize || 1)),
      getLineUnit: (l) => l.packageUnit || l.normalizedUnit,
    },
    // ...
  });
}, [purchases, inventory, ...]);
```

### 3. Update Sidebar Navigation

**File:** `src/FarmCalcApp.tsx` (Sidebar component, lines 213-240)

Reorganize into a Procurement section:

```typescript
{/* PROCUREMENT section */}
<div className="pt-4 mt-4 border-t border-stone-700">
  <div className="px-2 pb-2 text-xs text-stone-500 uppercase tracking-wider">Procurement</div>
  <NavButton id="plan-readiness" label="Order Status" icon={ClipboardCheck} />
  <NavButton id="purchases" label="Purchases" icon={ShoppingCart} />
  <NavButton id="vendor-spend" label="Vendor Spend" icon={DollarSign} />
</div>

{/* INVENTORY section - simplified */}
<div className="pt-4 mt-4 border-t border-stone-700">
  <div className="px-2 pb-2 text-xs text-stone-500 uppercase tracking-wider">Inventory</div>
  <NavButton id="inventory" label="On Hand" icon={Warehouse} />
</div>
```

### 4. Rename Header in PlanReadinessView

**File:** `src/components/farm/PlanReadinessView.tsx`

Match Dashboard terminology:

```typescript
<h2 className="text-2xl font-bold text-stone-800">Order Status</h2>
<p className="text-sm text-stone-500 mt-1">
  Product availability for {season?.year || 'current'} crop plans
</p>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/FarmCalcApp.tsx` | Restore plan-readiness route, update sidebar nav |
| `src/components/farm/PlanReadinessView.tsx` | Use SimplePurchase, rename header |

---

## Result

After implementation:
1. Dashboard "Order Status" widget click → navigates to detailed Order Status view
2. Order Status view shows per-product breakdown: Need / On Hand / On Order
3. Vendor Spend is accessible from sidebar
4. Procurement section groups related views together
5. Inventory "On Hand" properly flows into Order Status calculations

---

## Data Flow Diagram

```text
                    ┌─────────────────┐
                    │   Crop Plans    │
                    │ (defines need)  │
                    └────────┬────────┘
                             │
                             ▼
         ┌───────────────────────────────────────┐
         │            ORDER STATUS               │
         │  ┌─────────┬──────────┬─────────────┐ │
         │  │  NEED   │ ON HAND  │  ON ORDER   │ │
         │  │  (plan) │  (inv)   │ (purchases) │ │
         │  └─────────┴──────────┴─────────────┘ │
         │                                       │
         │  READY = On Hand >= Need              │
         │  ON_ORDER = On Hand + On Order >= Need│
         │  BLOCKING = Short                     │
         └───────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  Purchases   │ │ Vendor Spend │ │  Inventory   │
    │  (create)    │ │  (project)   │ │  (On Hand)   │
    └──────────────┘ └──────────────┘ └──────────────┘
```

