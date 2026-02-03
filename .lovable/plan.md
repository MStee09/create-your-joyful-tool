

# Chemical Product View & Vendor/Manufacturer Separation

## Overview

This plan implements two interconnected improvements from the PRD:
1. Products can be created without a vendor upfront (manufacturer + estimated price as fallback)
2. Pricing hierarchy: lowest vendor price wins, else estimated price
3. Plan-blocking when no price exists

## What Already Exists (from previous phases)

- ChemicalProductDetailView with tabbed layout (Overview, Rates, Restrictions, Mixing, Documents)
- Chemical data types and reusable table components
- Category filter tabs and data status indicators in ProductsListView
- Manufacturer tracking utilities
- Database columns for manufacturer/extraction metadata
- Routing for chemical products to dedicated view
- Extract-label edge function already extracts manufacturer

---

## Implementation Plan

### Phase 1: Pricing Utility (New File)

Create `src/lib/pricingUtils.ts` with:
- `getEffectivePrice()` - returns lowest vendor price or falls back to estimatedPrice
- `canAddToPlan()` - checks if product can be added to crop plan (has vendor price OR estimated price)
- `getPricingStatus()` - returns status indicator for UI display

```text
Price Hierarchy:
  1. Lowest vendor offering price (if any)
  2. Product estimatedPrice (fallback)
  3. null (cannot add to plan)
```

### Phase 2: Add Product Flow Simplification

Modify `ProductsListView.tsx`:
- Remove step 2 entirely (no vendor requirement)
- Single-step modal with:
  - Product Name (required)
  - Category (required)
  - Form (required)
  - Manufacturer (required for pesticides, optional otherwise)
  - EPA Registration # (optional, for chemicals)
  - Estimated Price + Unit (optional fallback)
  - Density (optional, for liquids)
- After save: navigate to product detail page
- Add manufacturer autocomplete using existing KNOWN_MANUFACTURERS

Modal wireframe:
```text
+--------------------------------------------------+
| Add Product                                  [X] |
+--------------------------------------------------+
| Product Name *                                   |
| [                                           ]    |
|                                                  |
| Category *                [Herbicide        v]   |
|                                                  |
| Form *    ( ) Liquid    (o) Dry                  |
|                                                  |
| --- Manufacturer (shown for chemicals) ---       |
| Manufacturer *            [BASF             v]   |
| EPA Reg. #               [                  ]    |
|                                                  |
| --- Optional ---                                 |
| Estimated Price (for planning before quotes)     |
| [$           ] per [gal v]                       |
|                                                  |
| Density (lbs/gal)                                |
| [              ]                                 |
|                                                  |
| [Cancel]                  [Save & View Product]  |
+--------------------------------------------------+
```

### Phase 3: VendorOfferingsTable Enhancements

Modify `VendorOfferingsTable.tsx`:
- Add "Lowest" badge next to lowest-priced offering
- Sort offerings by price ascending
- Show effective price summary at top when multiple offerings exist

### Phase 4: ProductsListView Price Display

Modify `ProductsListView.tsx`:
- Use `getEffectivePrice()` to display pricing
- Show source indicator: `$148/gal` (vendor) vs `$150/gal (est)`
- Show "No price" with amber warning for products without any pricing
- Add vendor status column/indicator:
  - Check: Has vendor(s) with price
  - Warning: No vendor, has estimated price
  - X: No vendor, no price

### Phase 5: ChemicalProductDetailView - Add Vendors Tab

Modify `ChemicalProductDetailView.tsx`:
- Add "Vendors" tab between Mixing and Documents
- Tab content includes:
  - Effective price display with source
  - Editable estimated price field (fallback)
  - VendorOfferingsTable component
  - Price history chart (if available)

### Phase 6: ProductSelectorModal - Block Without Price

Modify `ProductSelectorModal.tsx`:
- Use `canAddToPlan()` before allowing selection
- Show toast error if product has no price
- Visual indicator on products without pricing

### Phase 7: Product List Grouping (Optional Enhancement)

Add grouping dropdown to ProductsListView:
- Group by: None | Category | Active Ingredient | Manufacturer | MOA Group
- Active ingredient grouping uses chemicalData.activeIngredients[0].name

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/pricingUtils.ts` | Pricing hierarchy logic, canAddToPlan check |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/farm/ProductsListView.tsx` | Single-step modal, manufacturer field, effective price display, navigate to product after create |
| `src/components/farm/VendorOfferingsTable.tsx` | "Lowest" badge, price-sorted display |
| `src/components/farm/chemical/ChemicalProductDetailView.tsx` | Add Vendors tab with pricing section |
| `src/components/farm/ProductSelectorModal.tsx` | Block selection without price |

### Pricing Logic

```typescript
interface EffectivePrice {
  price: number;
  unit: string;
  source: 'vendor' | 'estimated';
  vendorId?: string;
  vendorName?: string;
}

function getEffectivePrice(
  product: ProductMaster,
  vendorOfferings: VendorOffering[],
  vendors: Vendor[]
): EffectivePrice | null {
  // 1. Get offerings for this product with valid prices
  const offerings = vendorOfferings
    .filter(o => o.productId === product.id && o.price > 0)
    .sort((a, b) => a.price - b.price);
  
  // 2. Lowest vendor price wins
  if (offerings.length > 0) {
    const lowest = offerings[0];
    const vendor = vendors.find(v => v.id === lowest.vendorId);
    return {
      price: lowest.price,
      unit: lowest.priceUnit,
      source: 'vendor',
      vendorId: lowest.vendorId,
      vendorName: vendor?.name,
    };
  }
  
  // 3. Fall back to estimated price
  if (product.estimatedPrice && product.estimatedPrice > 0) {
    return {
      price: product.estimatedPrice,
      unit: product.estimatedPriceUnit || product.defaultUnit || 'gal',
      source: 'estimated',
    };
  }
  
  return null;
}
```

### Add Product Flow Changes

Current flow:
```text
Step 1 (Name, Category, Form) -> Step 2 (Vendor, Price) -> Save
```

New flow:
```text
Single Step (Name, Category, Form, Manufacturer*, EstPrice) -> Save -> Navigate to Detail
```

The key change is that products can now exist without vendor offerings. The product detail page prompts users to add vendors when none exist.

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Pricing Utility | Small |
| Phase 2: Add Product Flow | Medium |
| Phase 3: VendorOfferingsTable | Small |
| Phase 4: ProductsListView Price Display | Medium |
| Phase 5: Vendors Tab in Chemical View | Medium |
| Phase 6: ProductSelectorModal | Small |
| Phase 7: Grouping (Optional) | Medium |

**Total: 5-6 sessions**

