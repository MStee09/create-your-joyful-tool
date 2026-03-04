

# Edit/Delete Price Records + Vendor Offering Role Clarification

## The Two Problems

**1. Can't edit or delete price records.** The backend functions `updatePriceRecord` and `deletePriceRecord` already exist in `useSupabaseData.ts` and are exported -- but no UI exposes them. The table rows have no edit or delete buttons.

**2. Vendor offerings feel pointless.** Right now vendor offerings store a price that goes stale immediately. The "Update Price" modal already syncs to the offering when you save, but there's no reverse flow: if someone edits a price record, the offering doesn't update. The offering price should always reflect the most recent price record for that vendor+product pair.

## My Recommendation on Vendor Offerings

Vendor offerings should serve two purposes:
- **Relationship**: which vendors carry which products (this drives the vendor dropdown filter)
- **Current price**: always auto-synced from the latest price record for that vendor+product

The offering price should NOT be independently editable. When you edit/delete a price record, the offering price auto-updates to match the latest remaining record. This eliminates the "stale offering" problem entirely.

## Changes

### 1. Add edit/delete to the Recent Prices table in `ProductPriceHistory.tsx`

Each row gets:
- **Edit** (pencil icon) -- opens an inline edit or the LogQuoteModal pre-filled with that record's data, saves via `onUpdatePriceRecord`
- **Delete** (trash icon) -- confirm dialog, calls `onDeletePriceRecord`

New props: `onUpdatePriceRecord` and `onDeletePriceRecord`.

### 2. Wire `updatePriceRecord` and `deletePriceRecord` through the component chain

- `FarmCalcApp.tsx` -- pass `updatePriceRecord` and `deletePriceRecord` to `ProductDetailView`
- `ProductDetailView.tsx` -- accept and forward to `ProductPriceHistory`
- `ProductPriceHistory.tsx` -- accept and use in table rows

### 3. Auto-sync vendor offering price after edit/delete

When a price record is edited or deleted, find the latest remaining price record for that vendor+product and update the vendor offering price to match. If no records remain, set offering price to 0.

This happens in `ProductPriceHistory` after a successful update/delete call, using the existing `onUpdateOfferings` prop.

### 4. LogQuoteModal: support edit mode

Add an optional `editingRecord` prop. When set:
- Modal title becomes "Edit Price Record"
- All fields pre-fill from the record
- Save calls `onUpdatePriceRecord(id, updates)` instead of `onAddPriceRecord`
- The type (quote/purchased) is preserved and editable

## Files to Modify

| File | Change |
|------|--------|
| `src/components/farm/ProductPriceHistory.tsx` | Add edit/delete buttons to table rows, edit modal state, auto-sync offering after changes |
| `src/components/farm/LogQuoteModal.tsx` | Add `editingRecord` prop for edit mode |
| `src/components/farm/ProductDetailView.tsx` | Accept and forward `onUpdatePriceRecord`, `onDeletePriceRecord` |
| `src/FarmCalcApp.tsx` | Pass `updatePriceRecord`, `deletePriceRecord` to ProductDetailView |

