

# Add Fuzzy Search to Product Selector in EntryModePanel

## Overview

Replace the current `Select` dropdown with a searchable `Popover` + `Command` combobox that provides fuzzy filtering as you type. This pattern is already used in `AddProductModal.tsx` for the manufacturer field.

## Current State

- Product selection uses a `Select` dropdown with vendor-grouped items
- No way to filter/search - users must scroll through all products
- With many products, finding the right one is slow

## Proposed UX

1. User clicks the product input field
2. A popover opens with a search box at top
3. Typing filters products in real-time (fuzzy matching on product name)
4. Vendor groupings are preserved for matching products
5. "Add New Product..." option always visible at top
6. Clicking a product selects it and closes the popover

## Files to Modify

| File | Change |
|------|--------|
| `src/components/farm/EntryModePanel.tsx` | Replace `Select` with `Popover` + `Command` combobox |

---

## Technical Details

### Import Changes

Add Command and Popover imports:
```typescript
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
```

### New State

```typescript
const [productSearchOpen, setProductSearchOpen] = useState(false);
const [productSearch, setProductSearch] = useState('');
```

### Filtered Products Logic

Filter products based on search term while preserving vendor grouping:
```typescript
const filteredProductsByVendor = useMemo(() => {
  if (!productSearch.trim()) return productsByVendor;
  
  const searchLower = productSearch.toLowerCase();
  return productsByVendor
    .map(group => ({
      ...group,
      products: group.products.filter(p => 
        p.name.toLowerCase().includes(searchLower)
      )
    }))
    .filter(group => group.products.length > 0);
}, [productsByVendor, productSearch]);
```

### Updated UI Component

Replace the Select with a Combobox pattern:
```tsx
<Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={productSearchOpen}
      className="w-full justify-between font-normal bg-background border-input"
    >
      {product ? (
        <div className="flex items-center gap-2">
          {product.form === 'liquid' ? (
            <Droplet className="h-3.5 w-3.5 text-blue-500" />
          ) : (
            <Weight className="h-3.5 w-3.5 text-amber-600" />
          )}
          <span className="truncate">{product.name}</span>
        </div>
      ) : (
        "Select product..."
      )}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </PopoverTrigger>
  
  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
    <Command shouldFilter={false}>
      <CommandInput 
        placeholder="Search products..." 
        value={productSearch}
        onValueChange={setProductSearch}
      />
      <CommandList className="max-h-[300px]">
        {/* Add New Product - always visible */}
        {onAddProduct && (
          <>
            <CommandItem
              onSelect={() => {
                setShowAddProductModal(true);
                setProductSearchOpen(false);
              }}
              className="text-primary font-medium"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Product...
            </CommandItem>
            <CommandSeparator />
          </>
        )}
        
        {/* Empty state */}
        <CommandEmpty>No products found</CommandEmpty>
        
        {/* Vendor-grouped products */}
        {filteredProductsByVendor.map(({ vendor, products: vendorProducts }) => (
          <CommandGroup 
            key={vendor?.id || 'unknown'} 
            heading={vendor?.name || 'Unknown Vendor'}
          >
            {vendorProducts.map(p => (
              <CommandItem
                key={p.id}
                value={p.id}
                onSelect={() => {
                  setProductId(p.id);
                  setProductSearchOpen(false);
                  setProductSearch('');
                }}
              >
                <Check className={cn(
                  "mr-2 h-4 w-4",
                  productId === p.id ? "opacity-100" : "opacity-0"
                )} />
                {p.form === 'liquid' ? (
                  <Droplet className="mr-2 h-3.5 w-3.5 text-blue-500" />
                ) : (
                  <Weight className="mr-2 h-3.5 w-3.5 text-amber-600" />
                )}
                {p.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

### Key Implementation Notes

1. **`shouldFilter={false}`** - Disable cmdk's built-in filtering since we're handling it ourselves to preserve vendor groupings

2. **Clear search on select** - Reset `productSearch` to empty when a product is selected

3. **Checkmark indicator** - Show a checkmark next to the currently selected product

4. **Preserve "Add New Product"** - Keep this option always visible at the top, outside the filtered list

---

## UI Preview

```text
┌─────────────────────────────────────────┐
│ 💧 Humic Acid 12%                   ▼  │  ← Trigger button
└─────────────────────────────────────────┘
                    ↓ Click
┌─────────────────────────────────────────┐
│ 🔍 Search products...                   │  ← CommandInput
├─────────────────────────────────────────┤
│ [+] Add New Product...                   │  ← Always visible
├─────────────────────────────────────────┤
│ AGRISOLUTIONS                            │  ← Group heading
│   ✓ 💧 Humic Acid 12%                    │  ← Selected
│     💧 Fulvic Acid 6%                    │
├─────────────────────────────────────────┤
│ NACHURS                                  │
│     💧 Bio-K                             │
│     ⚖️ AMS                               │
└─────────────────────────────────────────┘
```

When typing "hum":
```text
┌─────────────────────────────────────────┐
│ 🔍 hum                                  │
├─────────────────────────────────────────┤
│ [+] Add New Product...                   │
├─────────────────────────────────────────┤
│ AGRISOLUTIONS                            │
│   ✓ 💧 Humic Acid 12%                    │  ← Only matching products
└─────────────────────────────────────────┘
```

---

## Testing Checklist

1. Click the product field - popover opens with search input focused
2. Type a few characters - products filter in real-time
3. Vendor groups with no matches are hidden
4. "Add New Product..." always visible regardless of search
5. Click a product - it's selected, popover closes, search clears
6. Checkmark shows next to currently selected product
7. ESC key closes popover without changing selection
8. Arrow keys navigate between items

