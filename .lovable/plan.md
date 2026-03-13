

# Fix "Add Vendor to Product" Flow

## Problems Identified

### 1. Vendor created with client-side ID never persists correctly
In `ChemicalProductVendorsTab` and `ProductDetailView`, `onCreateVendor` builds a `Vendor` object with `crypto.randomUUID()` and calls `onAddVendor(newVendor)`. This flows to `handleUpdateVendors([...state.vendors, vendor])` which upserts the entire vendor array. The vendor IS persisted, but the `VendorOfferingsTable` only sets `formData.vendorId` to the new vendor's ID -- **it does NOT auto-submit the offering form**. The user creates a vendor, the dialog closes, the dropdown shows the new vendor selected, but they still have to click "Add Offering" manually. If they miss this, the vendor exists but no offering is created.

### 2. The "Add Vendor" form is confusing and incomplete
The inline add form (lines 446-531 of `VendorOfferingsTable`) shows a `<select>` dropdown with vendors and a "Price will be set when you log a quote" message. Issues:
- **Native `<select>` for the vendor dropdown** -- no search, no type-ahead, ugly on mobile
- **"+ Add new vendor..." as an `<option>`** -- this is a styling hack that doesn't render styled text in native selects, and the interaction of a select triggering a dialog is janky
- **Too many fields upfront** -- Packaging, SKU, Min Order, Freight Terms are all shown immediately. For a first-time add, users just want to pick a vendor and go. These details can be edited later via inline row editing.
- **No feedback after vendor creation** -- the new vendor dialog closes, the select updates, but there's no toast or visual confirmation

### 3. Two different "add vendor" experiences exist
- **From Product Detail → Vendors tab** uses `VendorOfferingsTable` inline form (select dropdown + optional new vendor dialog)
- **From Vendor Detail → Add Product** uses `AddProductToVendorModal` (full modal with search, product creation, pricing)

These two paths have different capabilities and UX patterns, creating inconsistency.

## Plan

### Simplify the "Add Vendor Offering" flow in `VendorOfferingsTable`

**Replace** the current inline form + native select + nested dialog with a single clean modal dialog:

1. **Step 1: Pick a vendor** -- Show a searchable list (like `ProductSelectorModal` pattern) of existing vendors, filtered to exclude vendors that already have an offering for this product. Include a prominent "+ Create New Vendor" button at the top.
2. **If creating new** -- Expand inline fields for name (required), email, phone (optional). On save, create vendor AND auto-proceed to step 2.
3. **Step 2: Confirm** -- After vendor is selected/created, auto-create the offering with default values (price=0, no packaging) and close. Show a toast: "Added [Vendor] -- log a quote to set pricing."

This eliminates:
- The janky native `<select>` with `__new__` option hack
- The multi-field form (packaging/SKU/freight shown upfront)
- The need for users to manually click "Add Offering" after creating a vendor

### Implementation Details

**File: `src/components/farm/VendorOfferingsTable.tsx`**
- Replace the `showAddForm` inline section (lines 446-531) with a `Dialog` that contains:
  - Search input filtering `vendors` list (excluding vendors already offering this product)
  - Clickable vendor rows (name + contact info preview)
  - "+ Create New Vendor" expandable section with name/email/phone fields
- On vendor selection: immediately call `handleAdd()` with that vendor ID and close
- On new vendor creation: call `onCreateVendor`, then immediately create offering with returned vendor ID
- Remove `showNewVendorDialog` state and the separate new vendor Dialog (lines 572-638) -- fold it into the single modal
- Show success toast after adding

**File: `src/components/farm/chemical/ChemicalProductVendorsTab.tsx`** and **`src/components/farm/ProductDetailView.tsx`**
- No changes needed -- they pass `onCreateVendor` to `VendorOfferingsTable` which will handle everything internally

### Result
- One clean modal instead of inline form + nested dialog
- Searchable vendor list instead of native `<select>`
- Auto-creates offering on selection (no manual "Add Offering" step)
- Inline "create vendor" within the same modal (no second dialog)
- Consistent with the app's existing modal patterns

