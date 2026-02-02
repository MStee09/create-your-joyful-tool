

## Inventory View: Add "Ordered" Section

### Overview
Enhance the Inventory view to show products that are **ordered but not yet received** alongside the existing "On Hand" inventory. This gives you a complete picture of your supply position—what you have vs. what's coming.

---

### What You'll See

**New Tab Layout:**
- **On Hand** — Current physical inventory (existing behavior)
- **Ordered** — Products with pending deliveries (new)
- **All** — Combined view showing both

**Ordered Items Show:**
- Product name and vendor
- Quantity ordered (from open purchase orders)
- Expected delivery date
- Order date
- Order status indicator

**Combined View Highlights:**
- Products that exist in both states show consolidated row
- "On Hand" quantity + "Ordered" quantity displayed together
- Quick visual indicator for items waiting on delivery

---

### Data Flow

The system already tracks this:
- **SimplePurchase** records with `status: 'ordered'` represent pending deliveries
- When you "Record Invoice" on a purchase, it changes to `status: 'received'` and adds to inventory

This change surfaces that existing data in the Inventory view.

---

### Technical Details

1. **InventoryView props update**
   - Add `simplePurchases: SimplePurchase[]` prop
   - Filter to `status === 'ordered'` for pending items

2. **New "Ordered" data calculation**
   - Aggregate ordered quantities by product from open purchase lines
   - Include vendor, expected delivery date, order date

3. **UI changes**
   - Add tab bar: All | On Hand | Ordered
   - "Ordered" rows show truck icon, expected date, order info
   - Summary cards update to show On Hand value + Ordered value

4. **FarmCalcApp wiring**
   - Pass `simplePurchases` from Supabase data hook to InventoryView

---

### Benefits
- See your full supply chain position in one view
- Know what's in transit vs. what's physically available
- Plan applications knowing what's arriving soon
- Matches the readiness engine logic used elsewhere

