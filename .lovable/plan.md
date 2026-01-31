

# Enhance Record Purchase Modal

## Summary

Improve the Record Purchase modal with smarter defaults and better UX by filtering products to only those associated with the selected vendor, auto-defaulting package sizes based on package type, adding a Total Gallons column, and pre-filling prices from historical data.

---

## Changes Overview

| Improvement | Description |
|-------------|-------------|
| Filter products by vendor | Only show products that have a VendorOffering for the selected vendor |
| Auto-default package sizes | Jug = 2.5 gal, Twin-pack = 5 gal, Tote = 275 gal, Drum = 30 gal, Bag = 50 lbs |
| Add Total Gal/Lbs column | Display `qty × size` for quick volume verification |
| Default price from history | Pre-fill last purchased/quoted price for product+vendor combo |
| Clear lines on vendor change | When vendor changes, clear incompatible line items |

---

## Technical Implementation

### 1. Pass Additional Data to Modal

The modal needs access to:
- `vendorOfferings` - to filter products by vendor
- `priceRecords` - to look up last prices

**File:** `src/components/farm/PurchasesView.tsx`

Update the modal props to include these.

### 2. Filter Products by Selected Vendor

**File:** `src/components/farm/RecordPurchaseModal.tsx`

```typescript
// Add vendorOfferings and priceRecords to props
interface RecordPurchaseModalProps {
  // ... existing props
  vendorOfferings: VendorOffering[];
  priceRecords: PriceRecord[];
}

// Filter products based on selected vendor
const vendorProducts = useMemo(() => {
  if (!vendorId) return [];
  const productIds = new Set(
    vendorOfferings
      .filter(o => o.vendorId === vendorId)
      .map(o => o.productId)
  );
  return products.filter(p => productIds.has(p.id));
}, [vendorId, vendorOfferings, products]);
```

### 3. Auto-Default Package Sizes

**File:** `src/components/farm/RecordPurchaseModal.tsx`

Add a mapping and update the package type change handler:

```typescript
const PACKAGE_SIZE_DEFAULTS: Record<string, { size: number; unit: 'gal' | 'lbs' }> = {
  'Tote': { size: 275, unit: 'gal' },
  'Twin-pack': { size: 5, unit: 'gal' },
  'Jug': { size: 2.5, unit: 'gal' },
  'Drum': { size: 30, unit: 'gal' },
  'Pail': { size: 5, unit: 'gal' },
  'Bag': { size: 50, unit: 'lbs' },
  'Bulk': { size: 1, unit: 'gal' },
};

// When package type changes:
onValueChange={val => {
  const defaults = PACKAGE_SIZE_DEFAULTS[val];
  const product = getProductInfo(line.productId);
  updateLine(line.id, { 
    packageType: val,
    packageSize: defaults?.size ?? line.packageSize,
    packageUnit: product?.form === 'dry' ? 'lbs' : (defaults?.unit ?? 'gal'),
  });
}}
```

### 4. Add Total Gallons/Lbs Column

**File:** `src/components/farm/RecordPurchaseModal.tsx`

Update grid layout and add new column:

```typescript
// Header (add after Size column)
<div>Total Vol</div>

// Line item row (add calculated total volume)
<div className="text-sm text-muted-foreground text-right">
  {(line.quantity * line.packageSize).toFixed(1)} {line.packageUnit}
</div>
```

Grid template update:
```typescript
// Before: grid-cols-[2fr_1fr_0.5fr_0.75fr_0.5fr_1fr_1fr_auto]
// After:  grid-cols-[2fr_1fr_0.5fr_0.75fr_0.5fr_0.75fr_1fr_1fr_auto]
//                                              ^^^^^^^ new column
```

### 5. Default Price from Last Record

**File:** `src/components/farm/RecordPurchaseModal.tsx`

Add helper to find last price and use when selecting product:

```typescript
const getLastPrice = (productId: string, vendorId: string) => {
  // Find most recent price record for this product+vendor
  const records = priceRecords
    .filter(r => r.productId === productId && r.vendorId === vendorId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (records.length > 0) {
    return records[0].price; // Package price, not normalized
  }
  
  // Fallback: check vendor offering
  const offering = vendorOfferings.find(
    o => o.productId === productId && o.vendorId === vendorId
  );
  if (offering) return offering.price;
  
  // Fallback: product estimated price
  const product = products.find(p => p.id === productId);
  return product?.estimatedPrice || 0;
};

// When product is selected:
onValueChange={val => {
  const prod = products.find(p => p.id === val);
  const lastPrice = getLastPrice(val, vendorId);
  updateLine(line.id, { 
    productId: val,
    packageUnit: prod?.form === 'liquid' ? 'gal' : 'lbs',
    unitPrice: lastPrice,
  });
}}
```

### 6. Clear Lines on Vendor Change

**File:** `src/components/farm/RecordPurchaseModal.tsx`

When vendor changes, clear incompatible lines or warn user:

```typescript
const handleVendorChange = (newVendorId: string) => {
  setVendorId(newVendorId);
  // Clear lines since products are vendor-specific
  if (lines.length > 0 && newVendorId !== vendorId) {
    setLines([]);
  }
};
```

---

## Additional UX Improvements

1. **Show product form icon** in dropdown (Droplets for liquid, Weight for dry)
2. **Disable Add Line button** until vendor is selected
3. **Show hint** when no vendor selected: "Select a vendor first to add products"
4. **Smart unit toggle** - auto-set unit based on product form

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/farm/RecordPurchaseModal.tsx` | Add filtering, defaults, Total Vol column, price lookup |
| `src/components/farm/PurchasesView.tsx` | Pass vendorOfferings and priceRecords to modal |

---

## Verification Checklist

After implementation:
- [ ] Select vendor and verify only their products appear in dropdowns
- [ ] Select "Jug" package and verify size auto-fills to 2.5 gal
- [ ] Select "Tote" package and verify size auto-fills to 275 gal
- [ ] Select "Twin-pack" and verify size auto-fills to 5 gal
- [ ] Verify Total Vol column shows qty × size correctly
- [ ] Add a product that has prior purchases and verify price pre-fills
- [ ] Change vendor and verify lines are cleared

