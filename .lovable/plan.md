

# Fix Purchases ↔ Order Status Data Connection

## Problems Found

### 1. Unit mismatch: on-order quantities vs planned quantities
The readiness engine compares raw numbers without unit conversion:
- **Planned usage** for container-based products (e.g., herbicide in jugs) returns quantities in **containers** (e.g., 3.5 jugs)
- **Purchase line `totalQuantity`** is the **expanded volume** (quantity × packageSize, e.g., 2 jugs × 1800g = 3600g)
- The engine sees "need 3.5, have 3600 on order" → marks as READY, which is wrong (or the reverse depending on direction)

For standard products (gal/lbs), the units should align, but for container-based products this is completely broken.

### 2. "Mark Received" doesn't update inventory
When a purchase is marked received in the Purchases view, it only updates the purchase status to `received`. It does **not** add items to inventory. So:
- Items disappear from "on order" (filtered out by `status !== 'ordered'`)
- Items never appear as "on hand" (no inventory records created)
- The product shows as "Need to Order" even though it was already purchased and received

### 3. Received purchases recorded directly also skip inventory
The RecordPurchaseModal allows recording a purchase with `status = 'received'` directly, but it also doesn't create inventory records.

## Plan

### Fix 1: Normalize on-order quantities to match planned units (PlanReadinessView.tsx + planReadinessUtils.ts)

In `getLineRemainingQty`, instead of returning `totalQuantity` (base units), convert back to the same unit system that `calculatePlannedUsage` uses:
- For container-based products: return container count (`line.quantity`) not expanded volume
- For standard products: return `totalQuantity` as-is (already in gal/lbs)

Detect container-based by checking if the product has `containerSize` and `priceUnit` in ['jug','bag','case','tote'].

### Fix 2: Auto-add inventory when purchase is marked received (PurchasesView.tsx)

In `handleMarkReceived`, after updating status, iterate over purchase lines and upsert inventory:
- For each line, find existing inventory row for that product
- If exists: add the `totalQuantity` to existing quantity
- If not: create new inventory row with `totalQuantity`, unit, and packaging info
- Also create an inventory transaction record for audit trail

### Fix 3: Auto-add inventory when recording a purchase as "received" (RecordPurchaseModal.tsx or FarmCalcApp.tsx)

After `onSave` returns a saved purchase with `status === 'received'`, call the same inventory-add logic.

### Files Modified
- `src/components/farm/PurchasesView.tsx` — add inventory creation in `handleMarkReceived`
- `src/components/farm/PlanReadinessView.tsx` — fix `getLineRemainingQty` to use container count for container-based products
- `src/lib/planReadinessUtils.ts` — same fix in the utils version
- `src/FarmCalcApp.tsx` — wire up inventory update after purchase save when status is 'received'

