
# Add "Create New Product" Option in Pass Product Selector

## Overview

When adding a product to a pass, users need the ability to create a new product if it doesn't already exist in the dropdown. This will integrate the `AddProductModal` into the `EntryModePanel` product selection flow.

## Current Flow

1. User clicks "+ Add Product" on a pass card
2. `handleAddApplication` creates a placeholder application with the first product
3. `EntryModePanel` opens with a product dropdown (grouped by vendor)
4. User must select from existing products only - **no way to add new products**

## Proposed Flow

1. User clicks "+ Add Product" on a pass card
2. `EntryModePanel` opens with product dropdown
3. At the top of the dropdown, a **"+ Add New Product..."** option appears
4. Clicking it opens `AddProductModal`
5. After saving, the new product is automatically selected in the panel
6. User continues configuring rate, acres, etc.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/farm/EntryModePanel.tsx` | Add "Add New Product" option, integrate `AddProductModal`, add callback for new products |
| `src/components/farm/CropPlanningView.tsx` | Pass `onAddProduct` callback and `productMasters` to EntryModePanel |

---

## Technical Details

### EntryModePanel Changes

**New Props:**
```typescript
interface EntryModePanelProps {
  // ...existing props...
  productMasters?: ProductMaster[];
  onAddProduct?: (product: ProductMaster) => void;
}
```

**State & Logic:**
- Add `showAddProductModal` state
- Import and render `AddProductModal`
- Add a "special" item at the top of the product select that triggers the modal
- When `AddProductModal.onSave` fires:
  1. Call `onAddProduct` to persist the new ProductMaster
  2. Create a temporary Product object from the ProductMaster for immediate selection
  3. Set `productId` to the new product's ID

**Dropdown Structure:**
```tsx
<SelectContent>
  {/* Add New Product option - always first */}
  <SelectItem value="__add_new__" className="text-primary font-medium">
    <div className="flex items-center gap-2">
      <Plus className="h-3.5 w-3.5" />
      Add New Product...
    </div>
  </SelectItem>
  
  <Separator className="my-1" />
  
  {/* Existing products grouped by vendor */}
  {productsByVendor.map(...)}
</SelectContent>
```

**Handler:**
```typescript
const handleProductChange = (value: string) => {
  if (value === '__add_new__') {
    setShowAddProductModal(true);
    return;
  }
  setProductId(value);
};

const handleNewProductSave = (newProductMaster: ProductMaster) => {
  // Notify parent to persist the new product
  onAddProduct?.(newProductMaster);
  
  // Create a Product from ProductMaster for immediate use
  const newProduct: Product = {
    id: newProductMaster.id,
    name: newProductMaster.name,
    form: newProductMaster.form,
    category: newProductMaster.category,
    price: newProductMaster.estimatedPrice || 0,
    priceUnit: newProductMaster.estimatedPriceUnit || 
               (newProductMaster.form === 'liquid' ? 'gal' : 'lbs'),
    vendorId: '', // No vendor yet
  };
  
  // Add to local products list and select it
  setProductId(newProductMaster.id);
  setShowAddProductModal(false);
};
```

### CropPlanningView Changes

Pass the required props to `EntryModePanel`:

```tsx
<EntryModePanel
  application={editingApplication}
  crop={crop}
  products={products}
  vendors={vendors}
  productMasters={productMasters}
  onAddProduct={handleAddNewProduct}
  onSave={handleSaveApplication}
  onDelete={handleDeleteApplication}
  onClose={() => setEditingApplication(null)}
/>
```

Add handler (or receive from parent):
```typescript
const handleAddNewProduct = (product: ProductMaster) => {
  // This will bubble up to FarmCalcApp through existing patterns
  // or use a prop passed down from parent
};
```

---

## UI Preview

The product dropdown will look like:

```text
┌─────────────────────────────────────────┐
│ Product                                  │
├─────────────────────────────────────────┤
│ [+] Add New Product...                   │ ← Primary color, clickable
├─────────────────────────────────────────┤
│ AGRISOLUTIONS                            │ ← Vendor group header
│   💧 Humic Acid 12%                      │
│   💧 Fulvic Acid 6%                      │
├─────────────────────────────────────────┤
│ NACHURS                                  │
│   💧 Bio-K                               │
│   ⚖️ AMS                                │
└─────────────────────────────────────────┘
```

---

## Edge Cases

1. **New product has no price** - The new product may only have an `estimatedPrice`. The EntryModePanel cost preview will still work since it already handles `product.price || 0`.

2. **Vendor not assigned** - New products won't have a `vendorId` initially. The product will appear under "Unknown Vendor" group until a vendor offering is added.

3. **Products list sync** - The parent component needs to refresh the `products` list after the new ProductMaster is saved. The existing data flow via `onAddProduct` → FarmCalcApp should handle this.

---

## Testing Checklist

1. Click "+ Add Product" on a pass
2. Open the product dropdown
3. Click "Add New Product..." at top
4. Fill in product details and save
5. Verify the new product is auto-selected
6. Set rate and save application
7. Verify the product appears in the pass
8. Verify the product appears in the Products list (sidebar)
