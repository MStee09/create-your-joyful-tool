
## Inventory View: Add "Ordered" Section ✅ COMPLETED

### Overview
Enhanced the Inventory view to show products that are **ordered but not yet received** alongside the existing "On Hand" inventory. This gives you a complete picture of your supply position—what you have vs. what's coming.

---

### What You'll See

**Tab Layout:**
- **All** — Combined view showing both On Hand + Ordered (default)
- **On Hand** — Current physical inventory
- **Ordered** — Products with pending deliveries

**Ordered Items Show:**
- Product name and vendor
- Quantity ordered (from open purchase orders)
- Expected delivery date
- Order date
- Order value

**Combined View ("All" tab) Highlights:**
- Products consolidated by product ID
- "On Hand" quantity + "Ordered" quantity displayed in separate columns
- Truck icon indicator for items with pending deliveries
- Footer shows On Hand value, Ordered value, and Total Position

---

### Summary Cards Updated
- **On Hand** — Total value of physical inventory
- **Ordered** — Total value of pending deliveries (with truck icon)
- **Liquid Products** — Count
- **Dry Products** — Count

---

### Implementation Complete
- ✅ Added `purchases` prop to InventoryView (SimplePurchase[])
- ✅ Filter purchases by `status === 'ordered'` and current season
- ✅ Tab bar: All | On Hand | Ordered
- ✅ "Ordered" rows show truck icon, expected date, order date
- ✅ "All" view shows combined On Hand + Ordered columns
- ✅ Summary cards show On Hand value + Ordered value separately
- ✅ Footer totals update based on active tab


