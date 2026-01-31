

# Fix: Consistent Acres Display Across All Passes

## Problem

Acres are only shown in passes that have multiple coverage tiers (e.g., Core + Trial). Single-tier passes (where all products are at 100% or all at 25%) hide the tier header entirely, which means acres are never displayed.

## Solution

Two changes to `src/components/farm/PassCard.tsx`:

### 1. Add Acres to Collapsed Header

Update the `CoverageDistribution` component to include acreage after the product count. This makes acres visible without expanding the pass.

**Current (lines 83-93):**
```tsx
return (
  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', style.bg, style.text)}>
      {label}
    </span>
    {count} product{count !== 1 ? 's' : ''}
  </span>
);
```

**Updated:**
```tsx
return (
  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', style.bg, style.text)}>
      {label}
    </span>
    {count} product{count !== 1 ? 's' : ''} · {acresTreated} ac
  </span>
);
```

This requires passing `crop.totalAcres` and the coverage groups to the component to calculate the max treated acres.

### 2. Always Show Tier Header in Expanded View

Remove the conditional `{summary.coverageGroups.length > 1 && ...}` so the tier header (with acres) is always visible.

**Current (line 469):**
```tsx
{summary.coverageGroups.length > 1 && (
```

**Updated:**
```tsx
{/* Always show tier header with acres */}
{(
```

## Changes Summary

| Location | Change |
|----------|--------|
| `CoverageDistribution` component (lines 67-117) | Add `totalAcres` prop and display calculated acres |
| Expanded view tier header (line 469) | Remove `coverageGroups.length > 1` condition |

## Result

- **Collapsed pass**: Shows "Core 5 products · 130 ac"
- **Expanded pass**: Always shows tier header with "Core 100% · 130 ac"
- Works for single-tier and multi-tier passes alike

