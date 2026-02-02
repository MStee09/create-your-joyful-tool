
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



