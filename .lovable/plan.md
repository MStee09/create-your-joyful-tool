

# Bug Fix: Stale Acres Value When Switching Crops

## Problem Identified

When switching between crops in the sidebar, the editable acres input in CropPlanningView shows the **previous crop's acres value** instead of the newly selected crop's value.

**Root Cause:** In `CropPlanningView.tsx` line 83:
```typescript
const [acresValue, setAcresValue] = useState(crop.totalAcres);
```

React's `useState` only uses the initial value on the first render. When the `crop` prop changes (user clicks different crop in sidebar), the `acresValue` state retains its old value.

**User Impact:**
- Click Corn (132 acres) in sidebar
- Click Barley (130 acres) in sidebar  
- Click the edit pencil for acres
- Input shows **132** instead of **130**

## Solution

Add a `useEffect` hook to synchronize `acresValue` whenever the crop changes:

```typescript
useEffect(() => {
  setAcresValue(crop.totalAcres);
  setEditingAcres(false); // Close edit mode when switching crops
}, [crop.id, crop.totalAcres]);
```

This ensures:
1. `acresValue` updates when user switches to a different crop (`crop.id` changes)
2. `acresValue` updates if the source of truth changes externally (`crop.totalAcres` changes)
3. Edit mode closes when switching crops to prevent confusion

## File Changes

| File | Change |
|------|--------|
| `src/components/farm/CropPlanningView.tsx` | Add useEffect to sync acresValue with crop changes |

## Implementation Details

**Location:** After line 83 (the `useState` for `acresValue`)

**Add:**
```typescript
// Sync acresValue when crop changes
useEffect(() => {
  setAcresValue(crop.totalAcres);
  setEditingAcres(false);
}, [crop.id, crop.totalAcres]);
```

## Verification

After fix:
- Switch between crops in sidebar
- Verify the acres editor (when clicked) shows correct value for each crop
- Verify editing acres on one crop, then switching, shows the new crop's correct acres

