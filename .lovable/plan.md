
# Simplify Coverage Distribution Display

## Problem
The current display shows every percentage bucket with its tier label, creating visual noise:
- "Core 100% (4) · Core 90% (1) · Building 50% (1) · Trial 25% (1)"

This is too busy, especially when multiple buckets share the same tier label.

## Solution
Consolidate products by tier (Core/Building/Trial) rather than by exact percentage. Show counts per tier only.

---

## Visual Change

**Before (too busy):**
```
Core 100% (4) · Core 90% (1) · Building 50% (1) · Trial 25% (1)
```

**After (clean):**
```
[Core] 5 · [Building] 1 · [Trial] 1
```

Or even simpler for single-tier passes:
```
[Core] 7 products
```

---

## Technical Implementation

### File: `src/components/farm/PassCard.tsx`

Update the `CoverageDistribution` component to aggregate by tier instead of displaying each percentage bucket:

```tsx
const CoverageDistribution: React.FC<{ 
  coverageGroups: CoverageGroup[]; 
  totalProducts: number;
}> = ({ coverageGroups, totalProducts }) => {
  if (coverageGroups.length === 0) return null;
  
  // Aggregate products by tier label (not by exact percentage)
  const tierCounts = coverageGroups.reduce((acc, g) => {
    const label = getCoverageLabel(g.acresPercentage);
    acc[label] = (acc[label] || 0) + g.applications.length;
    return acc;
  }, {} as Record<string, number>);
  
  const tiers = Object.entries(tierCounts) as [string, number][];
  
  // Single tier - simple display
  if (tiers.length === 1) {
    const [label, count] = tiers[0];
    const style = TIER_LABEL_STYLES[label];
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', style.bg, style.text)}>
          {label}
        </span>
        {count} product{count !== 1 ? 's' : ''}
      </span>
    );
  }
  
  // Multiple tiers - compact badges with counts
  // Order: Core first, then Building, then Trial
  const tierOrder = ['Core', 'Building', 'Trial'];
  const sortedTiers = tiers.sort((a, b) => 
    tierOrder.indexOf(a[0]) - tierOrder.indexOf(b[0])
  );
  
  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      {sortedTiers.map(([label, count]) => {
        const style = TIER_LABEL_STYLES[label];
        return (
          <span key={label} className="flex items-center gap-1">
            <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', style.bg, style.text)}>
              {label}
            </span>
            <span className="text-foreground/70">{count}</span>
          </span>
        );
      })}
    </span>
  );
};
```

---

## Result

| Scenario | Display |
|----------|---------|
| All 7 products at 100% | `[Core] 7 products` |
| Mixed coverage | `[Core] 5 · [Building] 1 · [Trial] 1` |
| Just trials | `[Trial] 3 products` |

The exact percentages (100%, 90%, 50%, 25%) are still visible when you expand the pass - the collapsed view just needs to communicate the **strategic mix**, not the exact numbers.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/farm/PassCard.tsx` | Update `CoverageDistribution` to aggregate by tier label instead of showing each percentage bucket |
